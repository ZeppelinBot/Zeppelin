import Vue from "vue";

Vue.directive("trim-code", {
  bind(el, binding) {
    el.innerHTML = el.innerHTML
      .replace(/(^\n+|\n+$)/g, "")
      .split("\n")
      .map(line => line.slice(binding.value))
      .join("\n");
  },
});
