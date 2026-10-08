import { loadLanguage } from "./functions.js";
import { injectStyles } from "./style.js";
import { props } from "./props.js";
import { createButton, createModal } from "./ui-elements.js";

// One initializer, including when an Injector entry is accidentally run twice.
if (!window.__jfAvatarsInitialized) {
  window.__jfAvatarsInitialized = true;
  loadLanguage().then(() => {
    let scheduled = false;
    const mount = () => {
      scheduled=false;
      if (!window.location.hash.includes("/userprofile")) return;
      const target = document.querySelector(props.injectBtnModal());
      if (!target || document.getElementById(`${props.prefix}-btn-show-modal`)) return;
      injectStyles();
      target.before(createButton({id:"show-modal",textContent:props.getBtnShowAvatarsLabel(),onClick:createModal}));
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled=true;
      requestAnimationFrame(mount);
    };
    // Navigation integration only; gallery changes never trigger profile scans.
    const observer = new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.(`#${props.prefix}-modal`))) schedule();
    });
    observer.observe(document.body, {childList:true,subtree:true});
    window.addEventListener("hashchange",schedule);
    mount();
  }).catch(error => {
    window.__jfAvatarsInitialized=false;
    console.error("[jf-avatars] Initialization failed",error);
  });
}
