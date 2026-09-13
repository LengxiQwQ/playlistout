export type Language = 'zh-CN' | 'en-US';

export interface Translations {
  header: {
    brandTagline: string;
    previewLink: string;
    numbersLink: string;
    github: string;
    fontDrawerCaption: string;
    fontPickerHint: string;
    languageSwitch: string;
  };
  fonts: {
    original: string;
    patrick: string;
    kalam: string;
    schoolbell: string;
    covered: string;
    comic: string;
    zhnote: string;
  };
  hero: {
    pasteDoodle: string;
    noLoginDoodle: string;
    subtitle: string;
    titlePrefix: string;
    titleHighlight: string;
  };
  search: {
    inputLabel: string;
    placeholder: string;
    parseButton: string;
    parsingButton: string;
    clearInput: string;
    quickSamplesLabel: string;
    sampleFolk: string;
    sampleJay: string;
    sampleJpKr: string;
    worksWith: string;
    platformQQ: string;
    platformQQDesc: string;
  };
  loading: {
    step1: string;
    step2: string;
    step3: string;
  };
  errors: {
    oopsTitle: string;
    invalidInput: string;
    unsupportedUrl: string;
    playlistNotFound: string;
    incompletePlaylist: string;
    upstreamTimeout: string;
    upstreamError: string;
    rateLimited: string;
    networkError: string;
    internalError: string;
    genericError: string;
    retry: string;
  };
  result: {
    doneParsingHint: string;
    parsedPlaylistSticker: string;
    tracksCount: string;
    creatorPrefix: string;
    viewOnQQ: string;
    parseAnother: string;
    justNow: string;
  };
  table: {
    listTitle: string;
    colIndex: string;
    colCover: string;
    colTitle: string;
    colArtist: string;
    colAlbum: string;
    colDuration: string;
    noArtist: string;
    noAlbum: string;
  };
  export: {
    fileExportTitle: string;
    pickFormat: string;
    exportAction: string;
    takeListWithYou: string;
    quickCopyTitle: string;
    copyTitleOnly: string;
    copyTitleArtist: string;
    copyTitleArtistAlbum: string;
    toastExportSuccess: string;
    toastExportFailed: string;
    toastCopySuccess: string;
    toastCopyFailed: string;
  };
  infoNotes: {
    whyTitle: string;
    whyContent: string;
    whySubtext: string;
    whatTitle: string;
    whatItem1: string;
    whatItem2: string;
    whatItem3: string;
    whatItem4: string;
    noteTitle: string;
    noteContent: string;
    noteSubtext: string;
  };
  stats: {
    subtitle: string;
    title: string;
    todayTitle: string;
    todayParsed: string;
    todayTracks: string;
    allTimeTitle: string;
    allTimePlaylists: string;
    allTimeTracks: string;
    allTimeSubtext: string;
    fromWhereTitle: string;
  };
  privacy: {
    modalTitle: string;
    viewDataNotice: string;
    closeLabel: string;
    section1Title: string;
    section1Content: string;
    section2Title: string;
    section2Content: string;
    section3Title: string;
    section3Content: string;
    section4Title: string;
    section4Content: string;
    section5Title: string;
    section5Content: string;
    confirmButton: string;
  };
  footer: {
    drawnBy: string;
    copyright: string;
    githubLink: string;
    privacyLink: string;
  };
}
