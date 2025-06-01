import * as monaco from "monaco-editor";
import { configureMonacoYaml } from "monaco-yaml";
import schemaUri from "/config-schema.json?url";

window.MonacoEnvironment = {
  getWorker(_, label) {
    switch (label) {
      case "editorWorkerService":
        return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), { type: "module" });
      case "yaml":
        return new Worker(new URL("./yaml.worker.js", import.meta.url), { type: "module" })
      default:
        throw new Error(`Unknown label ${label}`);
    }
  },
};

configureMonacoYaml(monaco, {
  enableSchemaRequest: true,
  schemas: [{
    fileMatch: ["**/config.yaml"],
    uri: schemaUri,
  }],
});

const initialModel = monaco.editor.createModel("# Paste your config here to check it\n", undefined, monaco.Uri.parse("file:///config.yaml"));
initialModel.updateOptions({ tabSize: 2 });

const editorRoot = document.getElementById("editor")!;
const errorsRoot = document.getElementById("errors")!;

monaco.editor.defineTheme("zeppelin", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#00000000",
    "editor.focusBorder": "#00000000",
    "list.focusOutline": "#00000000",
    "editorStickyScroll.background": "#070c11",
  },
});
monaco.editor.create(editorRoot, {
  automaticLayout: true,
  model: initialModel,
  quickSuggestions: {
    other: true,
    comments: true,
    strings: true,
  },
  theme: "zeppelin",
  minimap: {
    enabled: false,
  },
});

function showErrors(markers: monaco.editor.IMarker[]) {
  if (markers.length) {
    markers.sort((a, b) => a.startLineNumber - b.startLineNumber);
    const frag = document.createDocumentFragment();
    for (const marker of markers) {
      const error = document.createElement("div");
      error.classList.add("error");
      
      const lineMarker = document.createElement("strong");
      lineMarker.innerText = `Line ${marker.startLineNumber}: `;

      const errorText = document.createElement("span");
      errorText.innerText = marker.message;

      error.append(lineMarker, errorText);
      frag.append(error);
    }
    errorsRoot.replaceChildren(frag);
  } else {
    const success = document.createElement("div");
    success.classList.add("noErrors");
    success.innerText = "No errors!";
    errorsRoot.replaceChildren(success);
  }
}

monaco.editor.onDidChangeMarkers(([uri]) => {
  const markers = monaco.editor.getModelMarkers({ resource: uri });
  showErrors(markers);
});

showErrors([]);
