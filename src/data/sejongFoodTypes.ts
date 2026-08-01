export type FoodTruckId='local'|'street'|'dessert';
export type FoodItemType='restaurant'|'local_food'|'cafe';

export type SejongFoodPlace={
  id:string;truckId:FoodTruckId;itemType:FoodItemType;name:string;menuName:string;
  category:string[];tags:string[];district:string;address:string;priceRange:string;
  openingHours:string;closedDays:string;description:string;features:string[];
  nearbyPlaces:string[];imageUrl:string;imageSource:string;mapUrl:string;
  origin?:string;season?:string;purchasePlaces?:string[];festival?:string;
  atmosphereTags?:string[];localIngredient?:string;photoZone?:boolean;
  infoSections?:Array<{id:string;title:string;content:string}>;
  sourceUrl:string;sourceLabel:string;verifiedAt:string;active:boolean;
};
