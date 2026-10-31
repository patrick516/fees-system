// 🎯 Check if the current user is in read-only mode (Group Director viewing a school)
export const isReadOnly = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("isViewingAsGroupAdmin") === "true";
};
