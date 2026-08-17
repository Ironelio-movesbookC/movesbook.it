"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const CKEditor = dynamic(
  () =>
    import("@ckeditor/ckeditor5-react").then(
      (module) => module.CKEditor
    ),
  {
    ssr: false,
  }
);

type Language =
  | "En"
  | "Fr"
  | "De"
  | "It"
  | "Es"
  | "Por"
  | "Rus"
  | "Ind"
  | "Chin"
  | "Arab";

const languages: Language[] = [
  "En",
  "Fr",
  "De",
  "It",
  "Es",
  "Por",
  "Rus",
  "Ind",
  "Chin",
  "Arab",
];

const initialContent: Record<Language, string> = {
  En: `
    <h2>ENG</h2>
    <h1>🏃 SportTracks</h1>
    <p>Welcome to The origins section.</p>
    <p>This is the English content for The origins.</p>
  `,
  Fr: "",
  De: "",
  It: "",
  Es: "",
  Por: "",
  Rus: "",
  Ind: "",
  Chin: "",
  Arab: "",
};

export default function OriginsPage() {
  const [selectedLanguage, setSelectedLanguage] =
    useState<Language>("En");

  const [content, setContent] =
    useState<Record<Language, string>>(initialContent);

  const [ClassicEditor, setClassicEditor] =
    useState<any>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    import("@ckeditor/ckeditor5-build-classic")
      .then((module) => {
        if (mounted) {
          setClassicEditor(() => module.default);
        }
      })
      .catch((error) => {
        console.error(
          "Failed to load CKEditor:",
          error
        );
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleEditorChange = (value: string) => {
    setContent((previous) => ({
      ...previous,
      [selectedLanguage]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      console.log("Saving origins:", content);

      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });

      alert("Saved successfully");
    } catch (error) {
      console.error("Unable to save:", error);
      alert("Unable to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-[10px] py-[15px] font-sans text-[14px] text-black">
      <div className="border border-[#aaa]">
        <div className="bg-gradient-to-b from-[#444] to-[#222] px-[12px] py-[8px] text-[14px] font-bold text-white">
          Sponsors Page
        </div>

        <div className="border-b border-[#aaa] px-[10px] py-[10px]">
          <div className="flex items-center gap-[5px]">
            {languages.map((language) => (
              <button
                key={language}
                type="button"
                onClick={() =>
                  setSelectedLanguage(language)
                }
                className={`min-w-[38px] px-[5px] py-[4px] text-[14px] ${
                  language === selectedLanguage
                    ? "border border-[#e25555] bg-[#fffde8]"
                    : "border border-transparent bg-white"
                }`}
              >
                {language}
              </button>
            ))}
          </div>
        </div>

        <div
          className="
            p-[10px]
            [&_.ck-editor]:w-full
            [&_.ck-toolbar]:rounded-none
            [&_.ck-toolbar]:border-[#ccc]
            [&_.ck-editor__editable]:min-h-[400px]
            [&_.ck-editor__editable]:max-h-[600px]
            [&_.ck-editor__editable]:overflow-y-auto
            [&_.ck-editor__editable]:rounded-none
            [&_.ck-content]:font-sans
            [&_.ck-content]:text-[14px]
          "
        >
          {ClassicEditor ? (
            <CKEditor
              key={selectedLanguage}
              editor={ClassicEditor}
              data={content[selectedLanguage]}
              onChange={(_, editor) => {
                handleEditorChange(editor.getData());
              }}
            />
          ) : (
            <div className="min-h-[400px] border border-[#ccc] bg-white" />
          )}
        </div>

        <div className="flex justify-center gap-[15px] border-t border-[#ccc] bg-[#f5f5f5] py-[15px]">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-[4px] border border-[#a00000] bg-gradient-to-b from-[#ff5c5c] to-[#d00000] px-[18px] py-[7px] text-[14px] font-bold text-white shadow-sm hover:from-[#ff7070] hover:to-[#b00000] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </main>
  );
}