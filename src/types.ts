/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HeritageItem {
  id: string;
  name: string;
  description: string;
  room: string;
  category: string;
  imageUrl?: string;
  images?: string[];
  year?: string;
  dimensions?: string;
  status: 'Disponibile' | 'Riservato' | 'Affidato' | 'Non in Vendita';
  acquisitionType: 'Vendita' | 'Lascito Affettivo' | 'Famiglia';
  price?: string;
  catawikiUrl?: string;
  destination?: 'Torino' | 'Barberino' | 'Altro' | 'Sorella' | 'Cinisello Balsamo';
  estimatedValue?: string;
  productCode?: string;
  isFeatured?: boolean;
  order?: number;
  technicalNotes?: string;
  wearCondition?: 'Ottimo' | 'Buono' | 'Discreto' | 'Da restaurare';
  shipping?: 'Ritiro in sede' | 'Spedizione possibile' | 'Solo ritiro' | 'Concordare';
  details?: { label: string; value: string }[];
  stories: Memory[];
  isFavorite?: boolean;
}

export interface Memory {
  id: string;
  author: string;
  text: string;
  date: string;
  itemId?: string;
}

export type ViewType = 'home' | 'catalog' | 'item-detail';
