import React, { useEffect, useRef, useState } from "react";
import "codemirror/lib/codemirror.css";
import "@toast-ui/editor/dist/toastui-editor.css";
import Editor from "@toast-ui/editor";

import wordFilter from "tinymce-word-paste-filter";
import sanitizeHtml from "sanitize-html";

function removeTags(str) {
  return sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} });
}

function createWordPasteIcon() {
  const button = document.createElement("button");
  button.innerHTML = `<img class='tui-editor-icon' src='/asset/toast-ui/ms-word.png' />`;
  return button;
}

const ConfiguredEditor = ({
  initialValue,
  saveComment,
  cancelEditComment,
  status = {}
}) => {
  const editorRef = useRef();

  const notifyUser = (message) => alert(message);

  useEffect(() => {
    if (editorRef.current) {
      return; // Skip re-instantiating editor.
    }

    const resize_width = 600; //without px

    const editor = new Editor({
      el: document.querySelector("#editor"),
      height: "200px",
      initialEditType: "wysiwyg",
      previewStyle: "tab",
      initialValue: initialValue,
      language: "nb-NO",
      hooks: {
        addImageBlobHook: (blob, callback) => {
          // when using the addImageBlobHook we have to convert to base64 ourself.
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = function (event) {
            const base64data = reader.result;

            const img = new Image(); //create a image
            img.src = base64data; //result is base64-encoded Data URI
            img.name = event.target.name; //set name (optional)
            img.size = event.target.size; //set size (optional)
            // once we have the image we scale/downsize it
            // we dont want/need raw footage files in the pdfs
            img.onload = function (el) {
              const elem = document.createElement("canvas"); //create a canvas

              //scale the image to 600 (width) and keep aspect ratio
              const scaleFactor = resize_width / el.target.width;
              elem.width = resize_width;
              elem.height = el.target.height * scaleFactor;

              //draw in canvas
              const ctx = elem.getContext("2d");
              ctx.drawImage(el.target, 0, 0, elem.width, elem.height);

              //get the base64-encoded Data URI from the resize image
              const srcEncoded = ctx.canvas.toDataURL(
                el.target,
                "image/jpeg",
                0
              );

              const stringLength =
                srcEncoded.length - "data:image/png;base64,".length;
              const sizeInBytes =
                4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
              const sizeInKb = sizeInBytes / 1000;
              console.log("size compr: ", sizeInKb);

              const megabyte = 1000 * 1000;
              // we need to set a maximum size for an image, otherwise the editing experience takes a drastic nosedive
              if (sizeInBytes > megabyte * 5) {
                notifyUser("Bildet er for stort, bruk et mindre bilde");
              } else {
                callback(srcEncoded);
              }
            };
          };
        }
      },
      toolbarItems: [
        "heading",
        "bold",
        "italic",
        "strike",
        "divider",
        "hr",
        "quote",
        "divider",
        "ul",
        "ol",
        "indent",
        "outdent",
        "divider",
        "table",
        "link",
        "divider",
        "image",
        "code",
        "codeblock",
        {
          type: "button",
          options: {
            className: "tui-editor-defaultUI-toolbar button",
            el: createWordPasteIcon(),
            event: "wordPasteButton",
            tooltip: "Lim fra Word"
          }
        }
      ]
    });

    editor.eventManager.listen("change", (event) => {
      let mdtext = editor.getMarkdown();

      let cleanedup_mdtext = wordFilter(mdtext);

      if (cleanedup_mdtext !== mdtext) {
        notifyUser("Du limte inn fra Word. Vi skal ha fikset på det.");
      }
      // cleanedup_mdtext = removeTags(cleanedup_mdtext)

      if (cleanedup_mdtext !== mdtext) {
        editor.setMarkdown(cleanedup_mdtext);
      }
    });

    /*
    the wordpaste button is present because native pasting of formatted text from standalone word on windows has a tendency to remove content or result in errors.

    The alternate way of solving this would be the following:
    1. listen to the browsers "paste"-event
    2. prevent the event from bubbling further with .stopPropagation()
    3. fetch the paste-content from the clipBoardData-object
    4. pre-process it in a way that preserves the content
    5. either a) create a new event with the processed content or b) insert the content directly with .insertText as below
    */
    editor.eventManager.addEventType("wordPasteButton");
    editor.eventManager.listen("wordPasteButton", async function () {
      const text = await navigator.clipboard.readText();
      const clip = await navigator.clipboard.read();

      if (clip[0].types.includes("text/html")) {
        console.log("inserting html");
        const blob = await clip[0].getType("text/html");
        const htmlAsString = await blob.text();

        const filteredText = wordFilter(htmlAsString);
        editor.setHtml(editor.getHtml() + filteredText);
      } else {
        editor.insertText(text);
      }
    });

    editorRef.current = editor;

    return () => {
      editor.remove();
    };
  }, [initialValue]);

  return (
    <>
      <div id="editor" />

      <div className="rdw-editor-flex u-padding-bottom">
        <button
          className="c-button-secondary c-draft-button rdw-editor-flex-child"
          onClick={() => {
            if (!editorRef.current) {
              return;
            }
            saveComment(removeTags(editorRef.current.getMarkdown()));
          }}
        >
          Lagre merknad
        </button>

        <button
          className="c-button-secondary c-draft-button rdw-editor-flex-child"
          disabled={status.active}
          onClick={cancelEditComment}
        >
          Avbryt
        </button>
      </div>
    </>
  );
};

export default ConfiguredEditor;
