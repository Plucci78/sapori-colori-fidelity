import { useState, useEffect, useRef } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs-preset-newsletter';

const useEmailEditor = (showNotification) => {
  const [emailContent, setEmailContent] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorRef = useRef(null);
  const grapesEditor = useRef(null);

  useEffect(() => {
    if (editorRef.current && !isEditorReady) {
      try {
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
                  }
                ],
              }
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
        setIsEditorReady(true);
        showNotification('🎨 Editor caricato!', 'success');
      } catch (error) {
        console.error('Errore GrapesJS:', error);
        showNotification('❌ Errore editor', 'error');
      }
    }

    return () => {
      if (grapesEditor.current) {
        try {
          grapesEditor.current.destroy();
        } catch (error) {
          console.log('Cleanup error:', error);
        }
      }
    };
  }, [showNotification]);

  const loadTemplate = (template) => {
    if (grapesEditor.current) {
      try {
        grapesEditor.current.setComponents(template.content);
        setEmailSubject(`${template.name} - {{nome}}`);
        showNotification(`✨ "${template.name}" caricato nell'editor!`, 'success');
      } catch (error) {
        console.error('Errore caricamento template:', error);
        showNotification('Errore caricamento template', 'error');
      }
    } else {
      showNotification('⏳ Editor non ancora pronto, riprova tra un secondo', 'warning');
    }
  };

  return {
    emailContent,
    emailSubject,
    loadTemplate,
    setEmailSubject,
    editorRef,
  };
};

export default useEmailEditor;