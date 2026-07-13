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