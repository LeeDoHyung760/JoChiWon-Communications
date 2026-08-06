export type FarmPoint = {x:number;z:number};

export function mirroredAcrossHouseX(houseCenter:FarmPoint,lakeCenter:FarmPoint):FarmPoint{
  return {x:houseCenter.x*2-lakeCenter.x,z:lakeCenter.z};
}

export function isInFrontOfHouse(point:FarmPoint,houseCenter:FarmPoint,frontDirection:FarmPoint){
  return (point.x-houseCenter.x)*frontDirection.x+(point.z-houseCenter.z)*frontDirection.z>0;
}

export function moveToHouseFront(point:FarmPoint,houseCenter:FarmPoint,frontDirection:FarmPoint,frontDistance:number):FarmPoint{
  if(isInFrontOfHouse(point,houseCenter,frontDirection))return point;
  return {x:point.x+frontDirection.x*frontDistance,z:point.z+frontDirection.z*frontDistance};
}
