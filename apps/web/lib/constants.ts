export const DEST_COOKIE = "nobar_dest";

/** Runs before paint so theme and simple mode never flash. */
export const PREFS_BOOT_SCRIPT = `try{var d=document.documentElement,t=JSON.parse(localStorage.getItem("nobar_theme")||'"system"');if(t==="dark"||t==="light")d.dataset.theme=t;if(JSON.parse(localStorage.getItem("nobar_simple")||"false"))d.setAttribute("data-simple-mode","")}catch(e){}`;
