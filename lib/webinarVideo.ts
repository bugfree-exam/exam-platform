export type WebinarVideoProviderValue = "RUTUBE" | "YANDEX_DISK" | "EXTERNAL";

export function getRutubeEmbedUrl(url: string) {
  const value = url.trim();

  const embedMatch = value.match(/rutube\.ru\/play\/embed\/([a-zA-Z0-9-]+)/);

  if (embedMatch?.[1]) {
    return `https://rutube.ru/play/embed/${embedMatch[1]}`;
  }

  const videoMatch = value.match(/rutube\.ru\/video\/([a-zA-Z0-9-]+)/);

  if (videoMatch?.[1]) {
    return `https://rutube.ru/play/embed/${videoMatch[1]}`;
  }

  return value;
}

export function getGenericVideoEmbedUrl(url: string) {
  const value = url.trim();

  if (value.includes("rutube.ru/")) {
    return getRutubeEmbedUrl(value);
  }

  const youtubeWatch = value.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (youtubeWatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeWatch[1]}`;
  }

  const youtubeShort = value.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (youtubeShort?.[1]) {
    return `https://www.youtube.com/embed/${youtubeShort[1]}`;
  }

  const youtubeEmbed = value.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (youtubeEmbed?.[1]) {
    return `https://www.youtube.com/embed/${youtubeEmbed[1]}`;
  }

  return value;
}

export function getWebinarEmbedUrl({
  provider,
  videoUrl,
  videoEmbedUrl,
}: {
  provider: WebinarVideoProviderValue;
  videoUrl: string;
  videoEmbedUrl: string | null;
}) {
  const manualEmbedUrl = videoEmbedUrl?.trim();

  if (manualEmbedUrl) {
    return manualEmbedUrl;
  }

  if (provider === "RUTUBE") {
    return getRutubeEmbedUrl(videoUrl);
  }

  return videoUrl.trim();
}

export function getVideoProviderLabel(provider: WebinarVideoProviderValue) {
  if (provider === "RUTUBE") {
    return "RuTube";
  }

  if (provider === "YANDEX_DISK") {
    return "Яндекс.Диск";
  }

  return "Внешний источник";
}
