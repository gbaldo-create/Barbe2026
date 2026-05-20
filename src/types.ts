export type ViewType = 'home' | 'catalog' | 'item-detail' | 'favorites' | 'adoption' | 'memories';

export type ItemStatus = 'Disponibile' | 'Riservato' | 'Affidato' | 'Venduto' | 'Non in Vendita';
export type AcquisitionType = 'Vendita' | 'Catawiki' | 'Lascito Affettivo' | 'Famiglia' | 'Regalo';
export type Destination = 'Barberino' | 'Firenze' | 'Torino' | 'Cinisello Balsamo' | 'Sorella' | 'Altro';
export type WearCondition = 'Ottimo' | 'Buono' | 'Discreto' | 'Da restaurare';
export type ShippingOption = 'Disponibile' | 'Non disponibile' | 'Da concordare' | 'Ritiro in sede' | 'Spedizione possibile' | 'Solo ritiro' | 'Concordare';

export interface Memory {
  id: string;
  author: string;
  text: string;
  date: string;
  itemId?: string;
}

export interface HeritageItem {
  id: string;
  name: string;
  description: string;
  room: string;
  category: string;
  year: string;
  dimensions: string;
  status: ItemStatus;
  acquisitionType: AcquisitionType;
  price: string;
  displayPrice?: string;
  estimatedValue: string;
  productCode: string;
  catawikiUrl?: string;
  imageUrl: string;
  images: string[];
  technicalNotes: string;
  destination: Destination;
  wearCondition: WearCondition;
  shipping: ShippingOption;
  isFeatured: boolean;
  isImportant?: boolean;
  isFavorite?: boolean;
  order: number;
  details: { label: string; value: string }[];
  stories?: Memory[];
  catawikiTitle?: string;
  catawikiCategory?: string;
  catawikiSubcategory?: string;
  catawikiStyle?: string;
  catawikiMaterial?: string;
  catawikiCountry?: string;
  catawikiRestored?: boolean;
  catawikiWeight?: string;
  catawikiShippingAvailable?: boolean;
  catawikiPickupAvailable?: boolean;
  catawikiDescription?: string;
  catawikiImages?: string[];
  catawikiSpecific?: Record<string, string | boolean>;
}
