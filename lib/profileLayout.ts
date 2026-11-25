/** Keeps the profile hero and its lower cards on one shared tablet column. */
export function getProfileContentMaxWidth(viewportWidth: number): number | undefined {
  return viewportWidth >= 900 ? 840 : undefined;
}
