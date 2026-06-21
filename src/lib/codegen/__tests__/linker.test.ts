import { describe, expect, it } from "vitest";
import { linkProject } from "../linker";

describe("linkProject", () => {
  it("should parse solution.json correctly and generate JS bundle", async () => {
    const solutionJson = JSON.stringify({
      project: "TestProject",
      language: "js",
      target: "dist/bundle.js",
      modules: [
        {
          name: "auth",
          path: "modules/auth",
          functions: [
            { name: "login", path: "modules/auth/login.drakon" },
            { name: "logout", path: "modules/auth/logout.drakon" }
          ]
        }
      ]
    });

    const getFile = async (path: string) => {
      if (path === "modules/auth/login.js") return "function login() { console.log('login'); }";
      if (path === "modules/auth/logout.js") return "function logout() { console.log('logout'); }";
      throw new Error(`File not found: ${path}`);
    };

    const result = await linkProject(solutionJson, getFile);

    expect(result.language).toBe("js");
    expect(result.targetPath).toBe("dist/bundle.js");
    expect(result.code).toContain("// Project: TestProject");
    expect(result.code).toContain("function login() { console.log('login'); }");
    expect(result.code).toContain("export const auth = {");
    expect(result.code).toContain("  login,");
    expect(result.code).toContain("  logout,");
    expect(result.code).toContain("export {");
    expect(result.code).toContain("  login,");
    expect(result.code).toContain("  logout,");
    expect(result.warnings).toHaveLength(0);
  });

  it("should parse solution.json correctly and generate Lua bundle", async () => {
    const solutionJson = JSON.stringify({
      project: "TestLuaProject",
      language: "lua",
      target: "dist/bundle.lua",
      modules: [
        {
          name: "math",
          path: "modules/math",
          functions: [
            { name: "add", path: "modules/math/add.drakon" }
          ]
        }
      ]
    });

    const getFile = async (path: string) => {
      if (path === "modules/math/add.lua") return "function add(a, b) return a + b end";
      throw new Error(`File not found: ${path}`);
    };

    const result = await linkProject(solutionJson, getFile);

    expect(result.language).toBe("lua");
    expect(result.targetPath).toBe("dist/bundle.lua");
    expect(result.code).toContain("-- Project: TestLuaProject");
    expect(result.code).toContain("local add");
    expect(result.code).toContain("function add(a, b) return a + b end");
    expect(result.code).toContain("local math = {");
    expect(result.code).toContain("  add = add,");
    expect(result.code).toContain("return {");
    expect(result.code).toContain("  math = math,");
    expect(result.warnings).toHaveLength(0);
  });

  it("should fail on invalid solution.json format", async () => {
    const getFile = async () => "";
    await expect(linkProject("invalid-json", getFile)).rejects.toThrow("Помилка парсингу solution.json");
    await expect(linkProject(JSON.stringify({}), getFile)).rejects.toThrow("відсутнє поле 'project'");
    await expect(linkProject(JSON.stringify({ project: "A", modules: "not-array" }), getFile)).rejects.toThrow("поле 'modules' має бути масивом");
  });

  it("should collect warnings for duplicate function names and missing names", async () => {
    const solutionJson = JSON.stringify({
      project: "DupProject",
      modules: [
        {
          name: "m1",
          functions: [
            { name: "foo" },
            { name: "" }
          ]
        },
        {
          name: "m2",
          functions: [
            { name: "foo" }
          ]
        }
      ]
    });

    const getFile = async (path: string) => {
      return `function foo() {}`;
    };

    const result = await linkProject(solutionJson, getFile);
    expect(result.warnings).toContain("Пропущено функцію без імені в модулі 'm1'");
    expect(result.warnings).toContain("Конфлікт імен: функція 'foo' дублюється в модулі 'm2' (раніше оголошена в 'm1')");
  });

  it("should throw error if file is missing", async () => {
    const solutionJson = JSON.stringify({
      project: "MissingProject",
      modules: [
        {
          name: "m1",
          functions: [
            { name: "foo" }
          ]
        }
      ]
    });

    const getFile = async () => {
      throw new Error("Disk error");
    };

    await expect(linkProject(solutionJson, getFile)).rejects.toThrow("Не вдалося завантажити скомпільований код для функції 'foo'");
  });
});
