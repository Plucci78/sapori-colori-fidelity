import StudioEditor from '@grapesjs/studio-sdk/react';
import { flexComponent, canvasFullSize, rteProseMirror, tableComponent, swiperComponent, canvasEmptyState, iconifyComponent, accordionComponent, listPagesComponent, fsLightboxComponent, layoutSidebarButtons, youtubeAssetProvider, lightGalleryComponent } from '@grapesjs/studio-sdk-plugins';
import '@grapesjs/studio-sdk/style';

export default function PageBuilder() {
  return (
    <StudioEditor
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
          // TODO: replace with a unique id for your projects. e.g. an uuid
          id: 'UNIQUE_PROJECT_ID'
        },
        identity: {
          // TODO: replace with a unique id for your end users. e.g. an uuid
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
          flexComponent.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/components/flex */ }),
          canvasFullSize.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/canvas/full-size */ }),
          rteProseMirror.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/rte/prosemirror */ }),
          tableComponent.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/components/table */ }),
          swiperComponent.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/components/swiper */ }),
          canvasEmptyState.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/canvas/emptyState */ }),
          iconifyComponent.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/components/iconify */ }),
          accordionComponent.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/components/accordion */ }),
          listPagesComponent.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/components/listPages */ }),
          fsLightboxComponent.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/components/fslightbox */ }),
          layoutSidebarButtons.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/layout/sidebar-buttons */ }),
          youtubeAssetProvider.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/asset-providers/youtube-asset-provider */ }),
          lightGalleryComponent.init({ /* Plugin options: https://app.grapesjs.com/docs-sdk/plugins/components/lightGallery */ })
        ]
      }}
    />
  );
}