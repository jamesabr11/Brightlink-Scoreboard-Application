// A focused number field or dropdown changes value when the wheel turns over it (Chrome and Firefox for number
// inputs, Firefox and some Windows browsers for selects), so scrolling the page could silently edit game rules.
// Blurring it on wheel makes the wheel scroll the page instead; clicking, typing and arrow keys still work, and
// range sliders are left alone. One listener covers every current and future control.
export const changesOnWheel = (el: { tagName?: string; type?: string } | null) =>
  el?.tagName === 'SELECT' || (el?.tagName === 'INPUT' && el.type === 'number');

export const guardWheel = (doc: Document = document) => {
  const onWheel = () => {
    const el = doc.activeElement as HTMLElement | null;
    if (changesOnWheel(el)) el!.blur();
  };
  doc.addEventListener('wheel', onWheel, { passive: true, capture: true });
  return () => doc.removeEventListener('wheel', onWheel, { capture: true });
};
