import { I } from 'ts/lib';

export enum LayoutStyle {
	Row		 = 0,
	Column	 = 1,
	Div		 = 2,
	Header	 = 3,
	Footer	 = 4,
};

export interface ContentLayout {
	style: LayoutStyle;
};

export interface BlockLayout extends I.Block {
	content: ContentLayout;
};