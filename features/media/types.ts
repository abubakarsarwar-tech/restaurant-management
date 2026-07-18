/** Media asset as handed to pickers/forms (subset of the registry row). */
export type MediaAssetRef = {
  id: string;
  publicId: string;
  secureUrl: string;
  alt: string | null;
  folder: string;
  width: number | null;
  height: number | null;
};

/** What a picker reports on selection. */
export type MediaSelection = {
  mediaId: string;
  url: string;
  alt: string | null;
};
