export const responsiveColumnClass = (column = {}) => {
  if (column.hideBelow === "sm" || column.priority === 2) return "hidden sm:table-cell";
  if (column.hideBelow === "md") return "hidden md:table-cell";
  if (column.hideBelow === "lg" || column.priority === 3) return "hidden lg:table-cell";
  if (column.hideBelow === "xl") return "hidden xl:table-cell";
  return "";
};

