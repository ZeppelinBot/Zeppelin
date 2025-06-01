declare module "*.vue" {
  import { DefineComponent } from "vue";
  const component: DefineComponent;
  export default component;
}

declare module "*.png" {
  const value: string;
  export default value;
}
