import hljs from "highlight.js/lib/core";
import Vue from "vue";

Vue.directive("highlightjs", {
  bind(el, binding) {
    if (!el.classList.contains("plain")) {
      hljs.highlightElement(el);
    }
  },
});
