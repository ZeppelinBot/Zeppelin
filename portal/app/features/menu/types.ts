export type MenuItem = {
  label: string;
  path: string;
  activeStartsWith?: boolean;
};

export type MenuCategory = {
  title: string;
  items: MenuItem[];
};
