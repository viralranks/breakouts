// components/CategoryTabs.jsx
import { For } from 'solid-js';
import { STOCK_GROUPS } from '../config/stockGroups';

export function CategoryTabs(props) {
  return (
    <div class="category-tabs-container">
      <div class="category-tabs">
        <For each={Object.entries(STOCK_GROUPS)}>
          {([key, group]) => (
            <button 
              class={`tab-button ${props.currentPackage() === key ? 'active' : ''}`}
              onClick={() => props.setCurrentPackage(key)}
            >
              {group.name}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}