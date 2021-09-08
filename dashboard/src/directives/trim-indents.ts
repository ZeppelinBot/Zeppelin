import Vue from "vue";

Vue.directive("trim-indents", {
  bind(el, binding) {
    const withoutStartEndWhitespace = el.innerHTML.replace(/(^\n+|\n+$)/g, "");

    const mode = binding.value != null ? binding.value : "start";

    let spacesToTrim;
    if (mode === "start") {
      const match = withoutStartEndWhitespace.match(/^\s+/);
      spacesToTrim = match ? match[0].length : 0;
    } else if (mode === "end") {
      const match = withoutStartEndWhitespace.match(/\s+$/);
      spacesToTrim = match ? match[0].length : 0;
    } else {
      spacesToTrim = parseInt(mode, 10);
    }

    el.innerHTML = withoutStartEndWhitespace
      .split("\n")
      .map((line) => line.slice(spacesToTrim))
      .join("\n");
  },
});
