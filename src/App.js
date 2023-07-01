import "./styles.css";
import Editor from "./Editor";

export default function App() {
  return (
    <div className="App">
      <h1>Debug ToastUI</h1>
      <Editor
        saveComment={(text) => {
          console.log("Text to save", text);
        }}
      />
    </div>
  );
}
