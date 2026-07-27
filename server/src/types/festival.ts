export type FestivalStatus='예정'|'진행중'|'종료';

export interface Festival {
  id:string;
  name:string;
  startDate:string;
  endDate:string;
  status:FestivalStatus;
  venue:string;
  description:string;
  organizer:string;
  host:string;
  sponsor:string;
  phone:string;
  homepage:string;
  relatedInfo:string;
  image?:string;
  source:'sejong'|'tour-api'|'sejong-official-2026';
}
