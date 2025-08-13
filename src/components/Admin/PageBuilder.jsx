import StudioEditor from '@grapesjs/studio-sdk/react';
import { flexComponent, canvasFullSize, rteProseMirror, tableComponent, swiperComponent, canvasEmptyState, iconifyComponent, accordionComponent, listPagesComponent, fsLightboxComponent, layoutSidebarButtons, youtubeAssetProvider, lightGalleryComponent } from '@grapesjs/studio-sdk-plugins';
import '@grapesjs/studio-sdk/style';

export default function PageBuilder() {
  return (
    <StudioEditor
      options={{
        licenseKey: '20dcb4e71c5e4edcb01cee40c282732d7e219020ae5646ac97298687dae3b19a',
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
          id: 'UNIQUE_PROJECT_ID'
        },
        identity: {
          id: 'UNIQUE_END_USER_ID'
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
          rteProseMirror.init({ }),
          tableComponent.init({ }),
          swiperComponent.init({ }),
          canvasEmptyState.init({ }),
          iconifyComponent.init({ }),
          accordionComponent.init({ }),
          listPagesComponent.init({ }),
          fsLightboxComponent.init({ }),
          layoutSidebarButtons.init({ }),
          youtubeAssetProvider.init({ }),
          lightGalleryComponent.init({ })
        ]
      }}
    />
  );
}