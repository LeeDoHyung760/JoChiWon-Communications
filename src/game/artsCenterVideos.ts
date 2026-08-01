export type ArtsCenterVideo={
  title:string;
  youtubeId:string;
  source:string;
};

export const ARTS_CENTER_VIDEOS:readonly (readonly ArtsCenterVideo[])[]=[
  [
    {title:'공식 티저',youtubeId:'vNIsRyxlbS0',source:'PAGE1 company'},
    {title:'공연 넘버 · 살다보면',youtubeId:'h0bX4MXGGdY',source:'PAGE1 company'},
    {title:'공연 하이라이트',youtubeId:'TkmEEb_6fVo',source:'THE MUSICAL'},
  ],
  [
    {title:'공식 티저',youtubeId:'DPZypHysr6w',source:'연극열전'},
  ],
  [
    {title:'레브드집시 공연 영상',youtubeId:'OdeMpm7Ns3M',source:'레브드집시 Reve de Gypsy'},
  ],
  [
    {title:'연희-판 공연 소개',youtubeId:'lWdSxXdX_Wc',source:'Seoul_4K'},
  ],
  [
    {title:'브람스 교향곡 1번 공연 영상',youtubeId:'YZVOBVQEA4E',source:'국립심포니오케스트라'},
  ],
] as const;
