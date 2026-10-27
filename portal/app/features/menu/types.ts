export interface MenuItem {
  label: string;
  path: string;
  activeStartsWith?: boolean;
}

export interface MenuCategory {
  title: string;
  items: MenuItem[];
}
