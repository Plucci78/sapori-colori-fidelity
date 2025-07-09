import React, { useEffect, useRef } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs-preset-newsletter';

const EmailEditor = ({ emailContent, setEmailContent, showNotification }) => {
  const editorRef = useRef(null);
  const grapesEditor = useRef(null);

  useEffect(() => {
    if (editorRef.current) {
      const editor = grapesjs.init({
        container: editorRef.current,
        height: '600px',
        width: 'auto',
        plugins: ['gjs-preset-newsletter'],
        storageManager: false,
        panels: {
          defaults: [
            {
              id: 'basic-actions',
              el: '.panel__basic-actions',
              buttons: [
                {
                  id: 'preview',
                  className: 'btn-preview',
                  label: '👁️ Preview',
                  command: 'preview',
                },
                {
                  id: 'export',
                  className: 'btn-export',
                  label: '📤 Export',
                  command: 'export-template',
                },
              ],
            },
          ],
        },
      });

      editor.on('update', () => {
        const html = editor.getHtml();
        const css = editor.getCss();
        const fullContent = css ? `<style>${css}</style>${html}` : html;
        setEmailContent(fullContent);
      });

      grapesEditor.current = editor;

      showNotification('🎨 Editor caricato!', 'success');
    }

    return () => {
      if (grapesEditor.current) {
        grapesEditor.current.destroy();
      }
    };
  }, [setEmailContent, showNotification]);

  return (
    <div>
      <div ref={editorRef} className="grapesjs-editor"></div>
      <div className="editor-help">
        💡 <strong>Come usare:</strong> 1) Scegli un template 2) Clicca sul testo per modificarlo 3) Personalizza il contenuto
      </div>
    </div>
  );
};

export default EmailEditor;