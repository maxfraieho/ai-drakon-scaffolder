#!/usr/bin/env python3
"""
mcp-aws.py — Agent-Workspace MCP client for AGY (Termux)
Connects to agent-workspace on RPi via SSH, speaks JSON-RPC.

Usage:
  python3 ~/bin/mcp-aws.py doctor
  python3 ~/bin/mcp-aws.py start
  python3 ~/bin/mcp-aws.py stop
  python3 ~/bin/mcp-aws.py screenshot [/tmp/output.png]
  python3 ~/bin/mcp-aws.py browser http://...   # open Chromium at URL
  python3 ~/bin/mcp-aws.py login [user] [pass]  # login to ai-drakon (owner/drakon-mcp-2026)
  python3 ~/bin/mcp-aws.py navigate http://...
  python3 ~/bin/mcp-aws.py click 640 400
  python3 ~/bin/mcp-aws.py type "hello world"
  python3 ~/bin/mcp-aws.py scroll down
  python3 ~/bin/mcp-aws.py snapshot
  python3 ~/bin/mcp-aws.py list

LOGIN: Uses CDP directly (bypasses React synthetic event issue).
Credentials for ai-drakon: owner / drakon-mcp-2026
"""
import json, sys, subprocess, base64, os, time, socket, struct

RPI = "vokov@192.168.3.234"
STATE_FILE = os.path.expanduser("~/.mcp-aws-state.json")


def load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def save_state(d):
    with open(STATE_FILE, "w") as f:
        json.dump(d, f)


class MCPSession:
    def __init__(self):
        self.proc = subprocess.Popen(
            ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10",
             "-T", RPI, "agent-workspace", "mcp", "--headless"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL
        )
        self._id = 0
        self._init()

    def _send(self, obj):
        line = (json.dumps(obj) + "\n").encode()
        self.proc.stdin.write(line)
        self.proc.stdin.flush()

    def _recv(self, timeout=30):
        import select
        ready, _, _ = select.select([self.proc.stdout], [], [], timeout)
        if not ready:
            return None
        line = self.proc.stdout.readline()
        return json.loads(line) if line.strip() else None

    def _rpc(self, method, params=None, timeout=30):
        self._id += 1
        self._send({"jsonrpc": "2.0", "id": self._id, "method": method,
                    "params": params or {}})
        return self._recv(timeout)

    def _init(self):
        self._rpc("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {"roots": {"listChanged": False}},
            "clientInfo": {"name": "mcp-aws", "version": "1.0"}
        })
        self._send({"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})

    def call(self, tool, args=None, timeout=60):
        return self._rpc("tools/call", {"name": tool, "arguments": args or {}}, timeout)

    def list_tools(self):
        return self._rpc("tools/list", {})

    def close(self):
        try:
            self.proc.terminate()
        except Exception:
            pass


def extract_text(result):
    """Extract text content from MCP tool result."""
    if not result:
        return "No response"
    content = result.get("result", {}).get("content", [])
    if isinstance(content, list):
        parts = []
        for item in content:
            if item.get("type") == "text":
                parts.append(item["text"])
        return "\n".join(parts) if parts else json.dumps(result)
    return json.dumps(result)


def save_screenshot(result, path):
    """Save screenshot PNG from MCP result. Screenshot runs on RPi, copies to local."""
    content = result.get("result", {}).get("content", [])
    # Always save locally to TMPDIR (Termux has no /tmp)
    tmpdir = os.environ.get("TMPDIR", "/data/data/com.termux/files/usr/tmp")
    basename = os.path.basename(path)
    local_path = os.path.join(tmpdir, basename)
    # Try image content first
    for item in content:
        if item.get("type") == "image" and item.get("data"):
            data = base64.b64decode(item["data"])
            with open(local_path, "wb") as f:
                f.write(data)
            return local_path
    # Fallback: parse json to get remote path
    try:
        data = result.get("result", {}).get("structuredContent")
        if not data:
            text = extract_text(result)
            data = json.loads(text)
        remote_path = data.get("screenshot", {}).get("path")
        if remote_path:
            subprocess.run(
                ["scp", "-o", "StrictHostKeyChecking=no",
                 f"{RPI}:{remote_path}", local_path],
                check=True, capture_output=True
            )
            return local_path
    except Exception as e:
        print(f"Error parsing/copying screenshot: {e}")
    return None


def cdp_connect_rpi(port, target_id):
    """Connect to Chrome DevTools on RPi via SSH tunnel."""
    # We SSH-forward the port first
    proc = subprocess.Popen(
        ["ssh", "-o", "StrictHostKeyChecking=no", "-L", f"{port}:127.0.0.1:{port}",
         "-N", RPI],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    time.sleep(1)
    try:
        sock = socket.create_connection(("127.0.0.1", port), timeout=10)
        sock.send((
            f"GET /devtools/page/{target_id} HTTP/1.1\r\n"
            f"Host: 127.0.0.1:{port}\r\n"
            "Upgrade: websocket\r\nConnection: Upgrade\r\n"
            "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        ).encode())
        resp = sock.recv(4096)
        if b"101" not in resp:
            raise Exception(f"CDP handshake failed: {resp[:80]}")
        return sock, proc
    except Exception:
        proc.terminate()
        raise


def cdp_send(sock, data):
    p = json.dumps(data).encode(); n = len(p); mask = b"\xfe\xdc\xba\x98"
    masked = bytes([p[i] ^ mask[i % 4] for i in range(n)])
    hdr = struct.pack("BB", 0x81, 0x80 | n) if n < 126 else struct.pack("!BBH", 0x81, 0xfe, n)
    sock.send(hdr + mask + masked)


def cdp_recv(sock, timeout=10):
    sock.settimeout(timeout)
    h = sock.recv(2); n = h[1] & 0x7f
    if n == 126: n = struct.unpack("!H", sock.recv(2))[0]
    d = b""
    while len(d) < n: d += sock.recv(n - len(d))
    return json.loads(d)


def cdp_eval(sock, js, id=1):
    cdp_send(sock, {"id": id, "method": "Runtime.evaluate",
                    "params": {"expression": js, "returnByValue": True}})
    r = cdp_recv(sock)
    return r.get("result", {}).get("result", {}).get("value")


def ai_drakon_login(port, target_id, username="owner", password="drakon-mcp-2026"):
    """Login to ai-drakon via CDP without SSH tunnel (direct on RPi)."""
    # Run login script directly on RPi
    script = f"""
import json, socket, struct, time, sys
PORT={port}; TARGET="{target_id}"
sock = socket.create_connection(("127.0.0.1", PORT), timeout=10)
sock.send(("GET /devtools/page/"+TARGET+" HTTP/1.1\\r\\nHost: 127.0.0.1:"+str(PORT)+"\\r\\n"
    "Upgrade: websocket\\r\\nConnection: Upgrade\\r\\n"
    "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\\r\\n"
    "Sec-WebSocket-Version: 13\\r\\n\\r\\n").encode())
sock.recv(4096)
def ws_s(d):
    p=json.dumps(d).encode();n=len(p);m=b"\\xfe\\xdc\\xba\\x98"
    r=bytes([p[i]^m[i%4] for i in range(n)])
    sock.send((struct.pack("BB",0x81,0x80|n) if n<126 else struct.pack("!BBH",0x81,0xfe,n))+m+r)
def ws_r():
    h=sock.recv(2);n=h[1]&0x7f
    if n==126:n=struct.unpack("!H",sock.recv(2))[0]
    d=b""
    while len(d)<n:d+=sock.recv(n-len(d))
    return json.loads(d)
ws_s({{"id":1,"method":"Runtime.evaluate","params":{{"expression":'''
(function(){{
var s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;
var ins=document.querySelectorAll("input");
s.call(ins[0],"{username}");ins[0].dispatchEvent(new Event("input",{{bubbles:true}}));
ins[0].dispatchEvent(new Event("change",{{bubbles:true}}));
s.call(ins[1],"{password}");ins[1].dispatchEvent(new Event("input",{{bubbles:true}}));
ins[1].dispatchEvent(new Event("change",{{bubbles:true}}));
return ins[0].value+"/"+ins[1].value.length;
}})()
''',"returnByValue":True}}}}); r=ws_r()
print("fill:",r.get("result",{{}}).get("result",{{}}).get("value"))
time.sleep(0.3)
ws_s({{"id":2,"method":"Runtime.evaluate","params":{{"expression":
    "document.querySelector(\\"button\\").click();location.href","returnByValue":True}}}})
ws_r()
time.sleep(4)
# Dismiss "Save password?" dialog if it appeared
ws_s({{"id":10,"method":"Runtime.evaluate","params":{{"expression":
    "(function(){{var btns=Array.from(document.querySelectorAll('button'));var b=btns.find(function(x){{return x.textContent.includes('No thanks')||x.textContent.includes('Never');}});if(b){{b.click();return 'dismissed';}}return 'no dialog';}})()","returnByValue":True}}}})
ws_r()
time.sleep(1)
ws_s({{"id":3,"method":"Runtime.evaluate","params":{{"expression":"location.href","returnByValue":True}}}}); r=ws_r()
print("url:",r.get("result",{{}}).get("result",{{}}).get("value"))
print("Login successful")
sock.close()
"""
    result = subprocess.run(
        ["ssh", "-o", "StrictHostKeyChecking=no", RPI, "python3"],
        input=script,
        capture_output=True, text=True, timeout=20
    )
    return result.stdout.strip() + result.stderr.strip()


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    cmd = args[0].lower()
    state = load_state()

    mcp = MCPSession()

    try:
        if cmd == "list":
            r = mcp.list_tools()
            tools = r.get("result", {}).get("tools", [])
            for t in tools:
                print(f"  {t['name']} — {t.get('description','')[:60]}")

        elif cmd == "doctor":
            r = mcp.call("workspace_doctor")
            print(extract_text(r))

        elif cmd == "start":
            r = mcp.call("workspace_start", {
                "acknowledge_hidden_workspace": True,
                "purpose": "ai-drakon testing",
                "width": 1280, "height": 800,
                "open_viewer": False
            }, timeout=30)
            text = extract_text(r)
            print(text)
            # Save workspace id if present
            result = r.get("result", {})
            ws_id = result.get("id") or result.get("workspace_id")
            if ws_id:
                state["workspace_id"] = ws_id
                save_state(state)
                print(f"Workspace ID: {ws_id}")

        elif cmd == "stop":
            ws_id = state.get("workspace_id")
            args_dict = {"id": ws_id} if ws_id else {}
            r = mcp.call("workspace_stop", args_dict)
            print(extract_text(r))
            state.pop("workspace_id", None)
            save_state(state)

        elif cmd == "screenshot":
            user_path = args[1] if len(args) > 1 else "aws-screenshot.png"
            # workspace_screenshot saves on RPi - use RPi /tmp path
            rpi_path = f"/tmp/{os.path.basename(user_path)}"
            r = mcp.call("workspace_screenshot", {"output_path": rpi_path})
            text = extract_text(r)
            # Copy from RPi to local TMPDIR
            saved = save_screenshot(r, user_path)
            if saved and os.path.exists(saved):
                print(f"Screenshot saved: {saved} ({os.path.getsize(saved)} bytes)")
            else:
                print(text)

        elif cmd == "login":
            username = args[1] if len(args) > 1 else "owner"
            password = args[2] if len(args) > 2 else "drakon-mcp-2026"
            # Get DevTools port from RPi
            port_result = subprocess.run(
                ["ssh", "-o", "StrictHostKeyChecking=no", RPI,
                 "cat /run/user/1000/agent-workspace-linux/default/browser-profile/DevToolsActivePort 2>/dev/null | head -1"],
                capture_output=True, text=True, timeout=15
            ).stdout.strip()
            # Get target from browser targets
            tgts_res = mcp.call("workspace_browser_targets", {})
            try:
                tgts = json.loads(extract_text(tgts_res))
            except Exception:
                tgts = {}
            target_id = None
            port = int(port_result) if port_result.isdigit() else 0
            if isinstance(tgts, dict):
                for t in tgts.get("targets", []):
                    if "login" in t.get("url", "") or "pages.dev" in t.get("url", ""):
                        target_id = t["id"]
                        break
                if not target_id and tgts.get("targets"):
                    target_id = tgts["targets"][0]["id"]
            if target_id and port:
                result = ai_drakon_login(port, target_id, username, password)
                print(result)
                if "/diagrams" in result or "/workspace" in result:
                    print("Login successful!")
                    state["logged_in"] = True
                    save_state(state)
            else:
                print(f"No browser target found. port={port} target={target_id}")
                print("Run: python3 ~/bin/mcp-aws.py browser https://ai-drakon-scaffolder.pages.dev first")

        elif cmd == "browser":
            url = args[1] if len(args) > 1 else "about:blank"
            # Try known chromium paths on RPi
            browser_paths = ["/usr/bin/chromium", "/usr/bin/chromium-browser",
                             "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"]
            browser_arg = {}
            for p in browser_paths:
                out, _, rc = ("", "", 1)
                # We'll just try all paths in order; agent-workspace will fail gracefully
            r = mcp.call("workspace_open_browser", {
                "url": url,
                "browser_path": "/usr/bin/chromium",
                "wait_window": False,
                "timeout_ms": 15000
            }, timeout=25)
            text = extract_text(r)
            print(text)
            # Save app_id and browser_target_id
            result = r.get("result", {})
            app_id = result.get("app_id")
            target_id = result.get("browser_target_id")
            if app_id:
                state["app_id"] = app_id
                save_state(state)
            if target_id:
                state["browser_target_id"] = target_id
                save_state(state)
            print(f"app_id={app_id} target_id={target_id}")

        elif cmd == "navigate":
            url = args[1]
            extra = {}
            if state.get("app_id"):
                extra["app_id"] = state["app_id"]
            if state.get("browser_target_id"):
                extra["target_id"] = state["browser_target_id"]
            r = mcp.call("workspace_browser_navigate", {"url": url, "snapshot": False, **extra}, timeout=20)
            print(extract_text(r))

        elif cmd == "snapshot":
            r = mcp.call("workspace_browser_snapshot")
            print(extract_text(r)[:3000])

        elif cmd == "click":
            x, y = int(args[1]), int(args[2])
            r = mcp.call("workspace_click", {"x": x, "y": y})
            print(extract_text(r))

        elif cmd == "type":
            text = args[1]
            r = mcp.call("workspace_type_text", {"text": text})
            print(extract_text(r))

        elif cmd == "scroll":
            direction = args[1] if len(args) > 1 else "down"
            r = mcp.call("workspace_scroll", {"direction": direction})
            print(extract_text(r))

        elif cmd == "key":
            key = args[1]
            r = mcp.call("workspace_key", {"key": key})
            print(extract_text(r))

        else:
            # Generic: pass tool name and optional JSON params
            tool = f"workspace_{cmd}"
            params = json.loads(args[1]) if len(args) > 1 else {}
            r = mcp.call(tool, params, timeout=60)
            print(extract_text(r))

    finally:
        mcp.close()


if __name__ == "__main__":
    main()
