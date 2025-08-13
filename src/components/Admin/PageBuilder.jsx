import React from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import { flexComponent, canvasFullSize, tableComponent, swiperComponent, iconifyComponent, accordionComponent, listPagesComponent, fsLightboxComponent, youtubeAssetProvider, lightGalleryComponent, rteProseMirror, canvasEmptyState, layoutSidebarButtons, canvasGridMode } from '@grapesjs/studio-sdk-plugins';
import '@grapesjs/studio-sdk/style';

const PageBuilder = () => {
  console.log('PageBuilder rendering, license key:', import.meta.env.VITE_GRAPESJS_LICENSE_KEY ? 'PRESENTE' : 'MANCANTE');
  
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <StudioEditor
        onLoad={(editor) => {
          console.log('GrapesJS Editor loaded successfully!', editor);
        }}
        onError={(error) => {
          console.error('GrapesJS Error:', error);
        }}
        options={{
          licenseKey: import.meta.env.VITE_GRAPESJS_LICENSE_KEY,
        theme: 'light',
        customTheme: {
          default: {
            colors: {
              global: {
                background1: "rgba(35, 30, 25, 1)",
                background2: "rgba(30, 25, 20, 1)",
                background3: "rgba(25, 20, 15, 1)",
                backgroundHover: "rgba(50, 40, 30, 1)",
                text: "rgba(220, 200, 180, 1)",
                border: "rgba(80, 60, 40, 1)",
                focus: "rgba(230, 150, 80, 0.8)",
                placeholder: "rgba(170, 150, 130, 1)"
              },
              primary: {
                background1: "#fdae4b",
                background3: "#d98a36",
                backgroundHover: "#ffb85c",
                text: "rgba(0, 0, 0, 1)"
              },
              component: {
                background1: "rgba(120, 70, 40, 1)",
                background2: "rgba(100, 60, 30, 1)",
                background3: "rgba(80, 50, 25, 1)",
                text: "rgba(220, 200, 180, 1)"
              },
              selector: {
                background1: "rgba(190, 110, 40, 1)",
                background2: "rgba(220, 140, 60, 1)",
                text: "rgba(255, 255, 255, 1)"
              },
              symbol: {
                background1: "#fdae4b",
                background2: "#e09341",
                background3: "#b87430",
                text: "rgba(255, 255, 255, 1)"
              }
            }
          }
        },
        project: {
          type: 'web',
          id: 'sapori-colori-project'
        },
        identity: {
          id: 'sapori-colori-user'
        },
        assets: {
          storageType: 'cloud'
        },
        storage: {
          type: 'cloud',
          autosaveChanges: 100,
          autosaveIntervalMs: 10000
        },
        plugins: [
          flexComponent.init({ }),
          canvasFullSize.init({ }),
          tableComponent.init({ }),
          swiperComponent.init({ }),
          iconifyComponent.init({ }),
          accordionComponent.init({ }),
          listPagesComponent.init({ }),
          fsLightboxComponent.init({ }),
          youtubeAssetProvider.init({ }),
          lightGalleryComponent.init({ }),
          rteProseMirror.init({ }),
          canvasEmptyState.init({ }),
          layoutSidebarButtons.init({ }),
          canvasGridMode.init({ })
        ]
        }}
      />
    </div>
  );
};

export default PageBuilder;