import { observable, action, computed, set, intercept, toJS } from 'mobx';
import { I, M, Util, Storage } from 'ts/lib';

const $ = require('jquery');

class BlockStore {
	@observable public rootId: string = '';
	@observable public archiveId: string = '';
	@observable public profileId: string = '';
	@observable public breadcrumbsId: string = '';
	@observable public recentId: string = '';
	@observable public storeIdType: string = '';
	@observable public storeIdTemplate: string = '';
	@observable public storeIdRelation: string = '';

	public treeMap: Map<string, any[]> = new Map();
	public blockMap: Map<string, I.Block[]> = new Map();
	public restrictionMap: Map<string, Map<string, any>> = new Map();

	@computed
	get root (): string {
		return this.rootId;
	};

	@computed
	get archive (): string {
		return this.archiveId;
	};

	@computed
	get profile (): string {
		return this.profileId;
	};

	@computed
	get breadcrumbs (): string {
		return this.breadcrumbsId;
	};

	@computed
	get recent (): string {
		return this.recentId;
	};

	@computed
	get storeType (): string {
		return this.storeIdType;
	};

	@computed
	get storeTemplate (): string {
		return this.storeIdTemplate;
	};

	@computed
	get storeRelation (): string {
		return this.storeIdRelation;
	};

	@action
	rootSet (id: string) {
		this.rootId = String(id || '');
	};

	@action
	archiveSet (id: string) {
		this.archiveId = String(id || '');
	};

	@action
	profileSet (id: string) {
		this.profileId = String(id || '');
	};

	@action
	storeSetType (id: string) {
		this.storeIdType = String(id || '');
	};

	@action
	storeSetTemplate (id: string) {
		this.storeIdTemplate = String(id || '');
	};

	@action
	storeSetRelation (id: string) {
		this.storeIdRelation = String(id || '');
	};

	@action
	breadcrumbsSet (id: string) {
		this.breadcrumbsId = String(id || '');
	};

	@action
	recentSet (id: string) {
		this.recentId = String(id || '');
	};

	@action
	set (rootId: string, blocks: I.Block[]) {
		this.blockMap.set(rootId, blocks);
		this.treeMap.set(rootId, this.getStructure(blocks));
	};

	@action
	clear (rootId: string) {
		this.blockMap.delete(rootId);
		this.treeMap.delete(rootId);
	};

	@action
	clearAll () {
		this.blockMap = new Map();
		this.treeMap = new Map();
		this.restrictionMap = new Map();
	};

	@action
	add (rootId: string, block: I.Block) {
		block = new M.Block(block);

		let blocks = this.getBlocks(rootId);
		let map = this.getMap(rootId);

		blocks.push(block);

		map[block.id] = observable({
			parentId: block.parentId,
			childrenIds: block.childrenIds,
		});

		intercept(map[block.id] as any, (change: any) => {
			if (change.newValue === map[block.id][change.name]) {
				return null;
			};
			return change;
		});
	};

	@action
	update (rootId: string, param: any) {
		let block = this.getLeaf(rootId, param.id);
		if (!block) {
			return;
		};
		set(block, param);
	};

	@action
	updateStructure (rootId: string, id: string, childrenIds: string[]) {
		let map = this.getMap(rootId);

		set(map[id], 'childrenIds', childrenIds);

		// Update parentId
		for (let id in map) {
			(map[id].childrenIds || []).map((it: string) => {
				if (map[it]) {
					map[it].parentId = id;
				};
			});
		};
	};

	@action
	delete (rootId: string, id: string) {
		let blocks = this.getBlocks(rootId);
		let map = this.getMap(rootId);

		blocks = blocks.filter((it: any) => { return it.id != id; });
		delete(map[id]);
	};

	restrictionsSet (rootId: string, restrictions: any) {
		let map = this.restrictionMap.get(rootId);

		if (!map) {
			map = new Map();
		};

		map.set(rootId, restrictions.object);

		for (let item of restrictions.dataview) {
			map.set(item.blockId, item.restrictions);
		};

		this.restrictionMap.set(rootId, map);
	};

	getMap (rootId: string) {
		return this.treeMap.get(rootId) || {};
	};

	getLeaf (rootId: string, id: string): any {
		let blocks = this.getBlocks(rootId);
		return blocks.find((it: any) => { return it.id == id; });
	};

	getBlocks (rootId: string, filter?: (it: any) => boolean) {
		let blocks = this.blockMap.get(rootId) || [];

		if (!filter) {
			return blocks;
		};

		return blocks.filter((it: any) => {
			if (filter) {
				return filter(it);
			};
			return true;
		});
	};

	getChildrenIds (rootId: string, id: string): string[] {
		const map = this.getMap(rootId);
		const element = map[id] || {};

		return element.childrenIds || [];
	};

	getChildren (rootId: string, id: string, filter?: (it: any) => boolean) {
		let blocks = this.getBlocks(rootId);
		let childrenIds = this.getChildrenIds(rootId, id);
		
		let childBlocks = childrenIds.map((it: string) => {
			return blocks.find((item: any) => { return item.id == it; });
		}).filter((it: any) => {
			if (!it) {
				return false;
			};
			if (filter) {
				return filter(it);
			};
			return true;
		});
		return childBlocks;
	};

	// If check is present - find next block if check passes or continue to next block in "dir" direction, else just return next block;
	getNextBlock (rootId: string, id: string, dir: number, check?: (item: I.Block) => any, list?: any): any {
		if (!list) {
			list = this.unwrapTree([ this.wrapTree(rootId) ]);
		};

		let idx = list.findIndex((item: I.Block) => { return item.id == id; });
		if (idx + dir < 0 || idx + dir > list.length - 1) {
			return null;
		};

		let ret = list[idx + dir];
		if (check && ret) {
			return check(ret) ? ret : this.getNextBlock(rootId, ret.id, dir, check, list);
		} else {
			return ret;
		};
	};

	getFirstBlock (rootId: string, dir: number, check: (item: I.Block) => any): I.Block {
		const list = this.unwrapTree([ this.wrapTree(rootId) ]).filter(check);
		return dir > 0 ? list[0] : list[list.length - 1];
	};

	getHighestParent (rootId: string, blockId: string): I.Block {
		const block = blockStore.getLeaf(rootId, blockId);
		const parent = blockStore.getLeaf(rootId, block.parentId);

		if (parent.isPage() || parent.isLayoutDiv()) {
			return block;
		} else {
			return this.getHighestParent(rootId, parent.id);
		};
	};

	setNumbers (rootId: string) {
		const root = this.wrapTree(rootId);
		if (!root) {
			return;
		};

		const cb = (list: any[]) => {
			list = list || [];

			let n = 0;
			for (let item of list) {
				if (!item.isLayout()) {
					if (item.isTextNumbered()) {
						n++;
						$('#marker-' + item.id).text(`${n}.`);
					} else {
						n = 0;
					};
				};

				cb(item.childBlocks);
			};
		};

		window.setTimeout(() => { cb(root.childBlocks); }, 10);
	};

	getStructure (list: I.Block[]) {
		list = Util.objectCopy(list || []);

		let map: any = {};

		list.map((item: any) => {
			map[item.id] = observable({
				parentId: '',
				childrenIds: item.childrenIds || [],
			});
		});

		for (let id in map) {
			(map[id].childrenIds || []).map((it: string) => {
				if (map[it]) {
					map[it].parentId = id;
				};
			});
		};

		return map;
	};

	getTree (rootId: string, list: I.Block[]): I.Block[] {
		list = Util.objectCopy(list || []);

		let map: any = {};

		for (let item of list) {
			map[item.id] = item;
		};

		for (let item of list) {
			let element = map[item.id];
			if (!element) {
				continue;
			};

			let childBlocks = element.childBlocks || [];
			let childrenIds = item.childrenIds || [];

			for (let id of childrenIds) {
				const child = map[id];
				if (!child) {
					continue;
				};

				child.parentId = item.id;
				childBlocks.push(child);
			};

			map[item.id].childBlocks = Util.arrayUniqueObjects(childBlocks, 'id');
		};

		return (map[rootId] || {}).childBlocks || [];
	};

	wrapTree (rootId: string) {
		let map = this.getMap(rootId);
		let ret: any = {};
		for (let id in map) {
			ret[id] = this.getLeaf(rootId, id);
			ret[id].parentId = String(map[id].parentId || '');
			ret[id].childBlocks = this.getChildren(rootId, id);
		};
		return ret[rootId];
	};

	unwrapTree (tree: any[]): any[] {
		tree = tree || [];

		let ret = [] as I.Block[];
		for (let item of tree) {
			if (!item) {
				continue;
			};

			let cb = item.childBlocks;
			delete(item.childBlocks);

			ret.push(item);
			if (cb && cb.length) {
				ret = ret.concat(this.unwrapTree(cb));
			};
		};
		return ret;
	};

	getRestrictions (rootId: string, blockId: string) {
		const map = this.restrictionMap.get(rootId);
		if (!map) {
			return [];
		};

		return map.get(blockId) || [];
	};

	isAllowed (rootId: string, blockId: string, flags: any[]): boolean {
		if (!rootId || !blockId) {
			return false;
		};

		const restrictions = this.getRestrictions(rootId, blockId);
		for (let flag of flags) {
			if (restrictions.indexOf(flag) >= 0) {
				return false;
			};
		};
		return true;
	};

	toggle (rootId: string, blockId: string, v: boolean) {
		const element = $(`#block-${blockId}`);

		v ? element.addClass('isToggled') : element.removeClass('isToggled');
		Storage.setToggle(rootId, blockId, v);
		$(window).trigger('resize.editor');
	};

};

export let blockStore: BlockStore = new BlockStore();
