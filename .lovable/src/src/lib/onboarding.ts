export function isOnboarded(userId: string): boolean {
  return localStorage.getItem(`ai_drakon_onboarded_${userId}`) === "true";
}

export function markOnboarded(userId: string): void {
  localStorage.setItem(`ai_drakon_onboarded_${userId}`, "true");
}
