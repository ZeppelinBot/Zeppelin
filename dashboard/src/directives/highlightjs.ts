import Vue from "vue";
import hljs from "highlight.js/lib/core";

Vue.directive("highlightjs", {
  bind(el, binding) {
    if(!el.classList.contains("plain")) {
    	hljs.highlightElement(el);
    };
  },
});
