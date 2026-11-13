/** Browser-safe, per-page brand metadata. */
export function brandHead(title: string, description: string, path?: string) {
  const url = path ? `https://elevated-emporium.lovable.app${path}` : undefined;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Walki Talkie" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(url ? [{ property: "og:url", content: url }] : []),
    ],
    links: url ? [{ rel: "canonical", href: url }] : [],
  };
}
