(function () {
	const blocksContainer = document.getElementById('blocks-container');
	const addBlockBtn = document.getElementById('add-block');
	const blockTypeSel = document.getElementById('block-type');

	function makeBlockEl(block) {
		const row = document.createElement('div');
		row.className = 'block-row';
		row.style.display = 'flex'; row.style.gap = '8px'; row.style.alignItems = 'center';

		const type = document.createElement('div');
		type.textContent = block.type || 'text';
		type.style.minWidth = '60px';

		// simple editor for properties
		const props = document.createElement('div');
		props.style.flex = '1';
		if (block.type === 'text' || !block.type) {
			const txt = document.createElement('textarea'); txt.value = block.text || ''; txt.placeholder = 'Text';
			txt.style.width = '100%';
			txt.addEventListener('input', () => row.dataset.block = JSON.stringify({ type:'text', text: txt.value }));
			props.appendChild(txt);
			row.dataset.block = JSON.stringify({ type:'text', text: txt.value });
		} else if (block.type === 'button') {
			const label = document.createElement('input'); label.value = block.label || 'Click me';
			const link = document.createElement('input'); link.value = block.href || '';
			label.placeholder='Button label';
			link.placeholder='https://example.com';
			label.addEventListener('input', () => row.dataset.block = JSON.stringify({ type:'button', label: label.value, href: link.value }));
			link.addEventListener('input', () => row.dataset.block = JSON.stringify({ type:'button', label: label.value, href: link.value }));
			props.appendChild(label); props.appendChild(link);
			row.dataset.block = JSON.stringify({ type:'button', label: label.value, href: link.value });
		} else if (block.type === 'image') {
			const url = document.createElement('input'); url.type='url'; url.value = block.url || '';
			const alt = document.createElement('input'); alt.value = block.alt || '';
			url.placeholder='https://...'; alt.placeholder='Alt text';
			url.addEventListener('input', () => row.dataset.block = JSON.stringify({ type:'image', url: url.value, alt: alt.value }));
			alt.addEventListener('input', () => row.dataset.block = JSON.stringify({ type:'image', url: url.value, alt: alt.value }));
			props.appendChild(url); props.appendChild(alt);
			row.dataset.block = JSON.stringify({ type:'image', url: url.value, alt: alt.value });
		} else if (block.type === 'hero') {
			const title = document.createElement('input'); title.value = block.title || '';
			const subtitle = document.createElement('input'); subtitle.value = block.subtitle || '';
			title.placeholder='Hero title'; subtitle.placeholder='Hero subtitle';
			title.addEventListener('input', () => row.dataset.block = JSON.stringify({ type:'hero', title: title.value, subtitle: subtitle.value }));
			subtitle.addEventListener('input', () => row.dataset.block = JSON.stringify({ type:'hero', title: title.value, subtitle: subtitle.value }));
			props.appendChild(title); props.appendChild(subtitle);
			row.dataset.block = JSON.stringify({ type:'hero', title: title.value, subtitle: subtitle.value });
		}

		const rm = document.createElement('button'); rm.type='button'; rm.className='remove-block'; rm.textContent='Remove';
		rm.addEventListener('click', () => row.remove());
		row.appendChild(type);
		row.appendChild(props);
		row.appendChild(rm);
		return row;
	}

	function addBlock(type) {
		const block = { type };
		const el = makeBlockEl(block);
		blocksContainer.appendChild(el);
	}

	if (addBlockBtn && blockTypeSel) addBlockBtn.addEventListener('click', () => {
		addBlock(blockTypeSel.value);
	});

	// expose getBlocks to app.js for publish
	window.getBlocks = function() {
		const rows = [...(blocksContainer ? blocksContainer.querySelectorAll('.block-row') : [])];
		return rows.map(r => {
			try { return JSON.parse(r.dataset.block || '{}'); } catch { return {}; }
		}).filter(Boolean);
	};

	// allow drag/drop ordering (simple)
	blocksContainer.addEventListener('dragstart', e => e.target.classList.add('dragging'));
	blocksContainer.addEventListener('dragend', e => e.target.classList.remove('dragging'));
	blocksContainer.addEventListener('dragover', e => {
		e.preventDefault();
		const after = [...blocksContainer.querySelectorAll('.block-row:not(.dragging)')].reduce((closest, child) => {
			const rect = child.getBoundingClientRect();
			const offset = e.clientY - rect.top - rect.height/2;
			if (offset < 0 && offset > closest.offset) return { offset, element: child };
			return closest;
		}, { offset: Number.NEGATIVE_INFINITY }).element;
		const dragging = blocksContainer.querySelector('.dragging');
		if (!dragging) return;
		if (!after) blocksContainer.appendChild(dragging);
		else blocksContainer.insertBefore(dragging, after);
	});
})();
