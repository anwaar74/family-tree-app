// This script is revised to join Che Mah nodes and draw a dashed line correctly
// Ensure both 'Che Mah' references are handled properly for d3 rendering

const width = 1400;
const dx = 6;
const dy = width / 6;

let i = 0;
let root;
let rajmahNodes = [];
let allNameObjects = [];
let allCouples = []; // For family autocomplete


// Helper: return all D3 nodes with parent chain for display
function getAllTreeNodes(root) {
  const all = [];
  root.each(function(d) {
    let aliasText = '';
    if (d.data.alias1 && d.data.alias2)
      aliasText = ` (${d.data.alias1}, ${d.data.alias2})`;
    else if (d.data.alias1)
      aliasText = ` (${d.data.alias1})`;
    else if (d.data.alias2)
      aliasText = ` (${d.data.alias2})`;
    all.push({
      d, // D3 node object
      display: `${d.data.name}${aliasText}`
    });
  });
  return all;
}

// Select the SVG element
const svg = d3.select("svg")
  .attr("viewBox", [-dy / 3, -dx, width, dx * 80]) // Initial viewBox, will be managed by zoom
  .style("font", "15px sans-serif")
  .style("user-select", "none")
  

// Create a main group for all tree elements, which will be transformed by zoom
const gCanvas = svg.append("g");

const tree = d3.tree().nodeSize([dx, dy]);
const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);

const gLink = gCanvas.append("g") // Append to gCanvas
  .attr("fill", "none")
  .attr("class", "link")
  .attr("stroke", "gray") // Add this line
  .attr("stroke-opacity", 0.4)
  .attr("stroke-width", 1.5)
  .attr("stroke", "gray");

const gExtra = gCanvas.append("g") // Append to gCanvas
  .attr("fill", "none")
  .attr("stroke", "gray")
  .attr("stroke-width", 2)
  .attr("stroke-dasharray", "4 2");

const gNode = gCanvas.append("g") // Append to gCanvas
  .attr("cursor", "pointer")
  .attr("pointer-events", "all");

// --- D3 Zoom Implementation ---
const zoom = d3.zoom()
  .scaleExtent([0.1, 8]) // Define how much you can zoom in and out
  .on("zoom", zoomed); // Call the zoomed function on zoom events

svg.call(zoom); // Apply the zoom behavior to the SVG

function zoomed(event) {
  gCanvas.attr("transform", event.transform); // Apply the zoom transform to gCanvas
}

// --- End D3 Zoom Implementation ---


function restructureData(data) {
  const nodeMap = new Map();
  const transformedMap = new Map();
  rajmahNodes = [];

  function indexNodes(node) {
    if (node.name) {
      nodeMap.set(node.name, node);
    }
    ["children", "spouses"].forEach(key => {
      if (Array.isArray(node[key])) {
        node[key].forEach(indexNodes);
      }
    });
  }
  indexNodes(data);

  function transformNode(node) {
    if (node.ref && nodeMap.has(node.ref)) {
      const refNode = nodeMap.get(node.ref);
      if (transformedMap.has(refNode)) {
        return transformedMap.get(refNode);
      }
      const t = transformNode(refNode);
      transformedMap.set(refNode, t);
      return t;
    }

    if (transformedMap.has(node)) {
      return transformedMap.get(node);
    }

  const transformed = {
    name: node.name,
    alias1: node.alias1 || null,
    alias2: node.alias2 || null,
    image: node.image || null,
    children: []
  };

    transformedMap.set(node, transformed);

    if (node.name === "Rajmah") {
  if (!rajmahNodes.includes(transformed)) {
    console.log("[DEBUG] Tracking Rajmah instance", transformed);
    rajmahNodes.push(transformed);
  }
} 

    if (node.spouses && Array.isArray(node.spouses)) {
      node.spouses.forEach(spouse => {
      const spouseContainer = {
        name: `+ ${spouse.name}`,
        alias1: spouse.alias1 || null,
        alias2: spouse.alias2 || null,
        image: spouse.image || null,
        children: []
      };

        if (Array.isArray(spouse.children)) {
          spouseContainer.children.push(...spouse.children.map(transformNode));
        }

        transformed.children.push(spouseContainer);
      });
    } else if (node.children && Array.isArray(node.children)) {
      transformed.children = node.children.map(transformNode);
    }

    return transformed;
  }

  return transformNode(data);
}

function update(source) {
  const nodes = root.descendants().reverse();
  const links = root.links();

  tree(root);

  let left = root;
  let right = root;
  let minY = Infinity; // Initialize for horizontal extent
  let maxY = -Infinity; // Initialize for horizontal extent
  root.eachBefore(node => {
    if (node.x < left.x) left = node;
    if (node.x > right.x) right = node;
     minY = Math.min(minY, node.y); // Track minimum y-coordinate
    maxY = Math.max(maxY, node.y); // Track maximum y-coordinate
  });

  const height = right.x - left.x + dx * 2;
  const viewBoxWidth = (maxY - minY) + dy * 2; // Horizontal extent with padding
  
  // Find and draw a red dashed line from Nawi to Hj Mek
  const nawiNode = nodes.find(n => n.data.name === "Nawi");
  const hjMekNode = nodes.find(n => n.data.name === "Hj Mek");

  const hjPakdo = nodes.find(n => n.data.name.includes("Pakdo"));
  const hjMek = nodes.find(n => n.data.name.includes("Hj Mek"));

  console.log("Drawing line from:", hjPakdo?.data?.name, "to", hjMek?.data?.name);

  if (hjPakdo && hjMek) {
    gExtra.selectAll("path.hjmek-pakdo-line").data([1])
      .join("path")
      .attr("class", "hjmek-pakdo-line")
      .attr("d", d3.linkHorizontal()({
        source: [hjPakdo.y, hjPakdo.x],
        target: [hjMek.y, hjMek.x]
      }))
      .attr("stroke", "gray")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2");
  }

  if (nawiNode && hjMekNode) {
    gExtra.selectAll("path.hjmek-line").data([1])
      .join("path")
      .attr("class", "hjmek-line")
      .attr("d", d3.linkHorizontal()({
        source: [nawiNode.y, nawiNode.x],
        target: [hjMekNode.y, hjMekNode.x]
      }))
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2");
  }

  // Removed viewBox transition here, as zoom behavior will manage the view

  const node = gNode.selectAll("g")
    .data(nodes, d => d.id || (d.id = ++i));

  const nodeEnter = node.enter().append("g")
    .attr("transform", d => `translate(${source.y0},${source.x0})`) // Initial position for new nodes
    .on("click", (event, d) => {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      update(d);
    });
  
  nodeEnter.append("circle")
    .attr("r", 4)
    .attr("fill", d => d.children ? "#555" : "#999")
    .attr("stroke-width", 1.5);

  nodeEnter.append("text")
  .attr("x", d => d.children ? -6 : 6)
  .attr("text-anchor", d => d.children ? "end" : "start")
  .attr("dy", "0.31em")
  .attr("fill", "#CCCCCC")
  .text(d => d.data.name)
  .on("click", (event, d) => {
    const img = document.getElementById("searchImage");
    const nameDiv = document.getElementById("searchName");
    let nodeWithImage = d;

  if (!d.data.image) {
    nodeWithImage = root.descendants().find(node =>
      node.data.name.toLowerCase() === d.data.alias1?.toLowerCase() ||
      node.data.name.toLowerCase() === d.data.alias2?.toLowerCase() ||
      node.data.alias1?.toLowerCase() === d.data.name.toLowerCase() ||
      node.data.alias2?.toLowerCase() === d.data.name.toLowerCase()
    );
  }

  if (nodeWithImage && nodeWithImage.data.image) {
    img.src = nodeWithImage.data.image;
    img.style.display = "block";
    nameDiv.textContent = nodeWithImage.data.name;
    nameDiv.style.display = "block";
  } else {
    img.style.display = "none";
    nameDiv.style.display = "none";
  }
});



  node.merge(nodeEnter).transition() // Use a generic transition here
    .duration(750) // Apply duration to the node transition
    .attr("transform", d => `translate(${d.y},${d.x})`)
    .attr("fill-opacity", 1)
    .attr("stroke-opacity", 1);

  node.exit().transition() // Use a generic transition here
    .duration(750) // Apply duration to the exit transition
    .remove()
    .attr("transform", d => `translate(${source.y},${source.x})`)
    .attr("fill-opacity", 0)
    .attr("stroke-opacity", 0);

  const link = gLink.selectAll("path.link")
    .data(links, d => d.target.id);
    
  const linkEnter = link.enter().append("path").attr("class", "link")
    .attr("d", d => {
      const o = { x: source.x0, y: source.y0 };
      return diagonal({ source: o, target: o });
    });

  link.merge(linkEnter).transition() // Use a generic transition here
    .duration(750) // Apply duration to the link transition
    .attr("d", diagonal);

  link.exit().transition() // Use a generic transition here
    .duration(750) // Apply duration to the exit transition
    .remove()
    .attr("d", d => {
      const o = { x: source.x, y: source.y };
      return diagonal({ source: o, target: o });
    });

  // Draw dashed line between the two Che Mah nodes
  const WeaHusen = nodes.find(n =>
  n.data.name === "Wea Husen" &&
  n.parent?.data?.name === "+ Esoh"
);
  const CheMah = nodes.find(n =>
  n.data.name === "+ Wea Husen" &&
  n.parent?.data?.name === "Che Mah"
);

  if (!WeaHusen) {
    console.warn("Wea Husen node not found");
  }
  if (!CheMah) {
    console.warn("Che Mah node not found");
  }

  if (WeaHusen && CheMah) {
    gExtra.selectAll("path.chemah-link").data([1])
      .join("path")
      .attr("class", "chemah-link")
      .attr("d", () => {
          // Control points for the curve
          const start = { x: WeaHusen.x, y: WeaHusen.y };
          const end = { x: CheMah.x, y: CheMah.y };
          
          // Calculate control points to create an arc
          const cp1 = {
              x: (start.x + end.x) / 2,
              y: Math.min(start.y, end.y) +80 // Adjust curvature height
          };
          
          return `M${start.y},${start.x} Q${cp1.y},${cp1.x} ${end.y},${end.x}`;
      })
      .attr("stroke", "gray") // Darker gray
      .attr("stroke-width", 3) // Thicker line
      .attr("stroke-dasharray", "8,4") // Longer dashes
      .attr("fill", "none");
}
 
  root.eachBefore(d => {
    d.x0 = d.x;
    d.y0 = d.y;
  });

  // Draw a custom line between Safiyoh and Rajmah
const safiyoh = nodes.find(n =>
  n.data.name === "Rajmah" &&
  n.parent?.data?.name === "+ Safiyoh"
);

const rajmah = nodes.find(n =>
  n.data.name === "+ Rajmah" &&
  n.parent?.data?.name === "Hj Abdullah"
);

if (safiyoh && rajmah) {
  gExtra.selectAll("path.safiyoh-link").data([1])
    .join("path")
    .attr("class", "safiyoh-link")
    .attr("d", diagonal({ source: safiyoh, target: rajmah }))
    .attr("stroke", "gray") // Darker gray
    .attr("stroke-width", 3) // Thicker line
    .attr("stroke-dasharray", "5,3"); // Optional: dashed line
}
  console.log("Searching for Safiyoh and Rajmah...");
  console.log("Safiyoh node position:", safiyoh?.x, safiyoh?.y);
  console.log("Rajmah node position:", rajmah?.x, rajmah?.y);


  // FIX: Abdulloh line: Hasan's -> Wan Huzaifah's
  const abdullahHasan = nodes.find(n =>
    n.data.name === "Abdulloh" &&
    n.parent?.data?.name === "+ Hasan"
  );

  const abdullahHuzaifah = nodes.find(n =>
    n.data.name === "+ Abdulloh" &&
    n.parent?.data?.name === "Wan Huzaifah"
  );

  if (abdullahHasan && abdullahHuzaifah) {
    gExtra.selectAll("path.abdullah-link").data([1])
      .join("path")
      .attr("class", "abdullah-link")
      .attr("d", diagonal({ source: abdullahHasan, target: abdullahHuzaifah }))
      .attr("stroke", "gray")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2");
  } else {
    console.warn("🔍 One or both Abdulloh nodes not found for linking");
    console.log("Abdulloh from Hasan:", abdullahHasan);
    console.log("Abdulloh from Wan Huzaifah:", abdullahHuzaifah);
  }

   
   // Draw dashed line between 2 Wea Mustapa nodes
  const mustapaSebanun = nodes.find(n =>
    n.data.name === "Wea Mustapa" &&
    n.parent?.data?.name === "+ Wea Sebanun" 
  );

  const mustapaUmar = nodes.find(n =>
    n.data.name === "Wea Mustapa" &&
    n.parent?.data?.name === "+ Umar" 
  );

 if (mustapaSebanun && mustapaUmar) {
    gExtra.selectAll("path.mustapaUmar-link").data([1])
      .join("path")
      .attr("class", "mustapaUmar-link")
      .attr("d", () => {
          // Control points for the curve
          const start = { x: mustapaSebanun.x, y: mustapaSebanun.y };
          const end = { x: mustapaUmar.x, y: mustapaUmar.y };
          
          // Calculate control points to create an arc
          const cp1 = {
              x: (start.x + end.x) / 2,
              y: Math.min(start.y, end.y) + 180 // Adjust curvature height
          };
          
          return `M${start.y},${start.x} Q${cp1.y},${cp1.x} ${end.y},${end.x}`;
      })
      .attr("stroke", "gray") // Darker grey
      .attr("stroke-width", 3) // Thicker line
      .attr("stroke-dasharray", "8,4") // Longer dashes
      .attr("fill", "none");
}

 // Draw a custom line between lukman and zaleha
const lukman = nodes.find(n =>
  n.data.name === "+ Zaleha" &&
  n.parent?.data?.name === "Lukman"
);

const zaleha = nodes.find(n =>
  n.data.name === "Zaleha" &&
  n.parent?.data?.name === "+ Rohana"
);

if (lukman && zaleha) {
  gExtra.selectAll("path.zaleha-link").data([1])
    .join("path")
    .attr("class", "zaleha-link")
    .attr("d", diagonal({ source: lukman, target: zaleha }))
    .attr("stroke", "gray") // Darker gray
    .attr("stroke-width", 3) // Thicker line
    .attr("stroke-dasharray", "5,3"); // Optional: dashed line
}
  console.log("Searching for Lukman and Zaleha...");
  console.log("Lukman node position:", lukman?.x, lukman?.y);
  console.log("Zaleha node position:", zaleha?.x, zaleha?.y);

  
   // Draw dashed line between 2 Sarimah nodes
  const sarimahUst = nodes.find(n =>
    n.data.name === "+ Sarimah" &&
    n.parent?.data?.name === "Abdul Rahim" 
  );

  const sarimahMaskah = nodes.find(n =>
    n.data.name === "Sarimah" &&
    n.parent?.data?.name === "+ Che Arong" 
  );

 if (sarimahUst && sarimahMaskah) {
     gExtra.selectAll("path.sarimah-link").data([1])
    .join("path")
    .attr("class", "sarimah-link")
    .attr("d", diagonal({ source: sarimahMaskah, target: sarimahUst }))
    .attr("stroke", "grey") // Darker gray
    .attr("stroke-width", 3) // Thicker line
    .attr("stroke-dasharray", "5,3"); // Optional: dashed line
}


}

function setupLineAutocomplete(inputId, suggestionsId, globalVar) {
  const input = document.getElementById(inputId);
  const suggestionBox = document.getElementById(suggestionsId);

  // Reset global reference when field is cleared
  input.addEventListener("input", function(e) {
    const value = e.target.value.trim().toLowerCase();
    suggestionBox.innerHTML = "";
    window[globalVar] = null;

    if (!value) {
      suggestionBox.style.display = "none";
      return;
    }

    // Use all tree nodes with context for suggestion dropdown
    const all = getAllTreeNodes(root);

    const suggestions = all.filter(s =>
      (s.d.data.name && s.d.data.name.toLowerCase().includes(value)) ||
      (s.d.data.alias1 && s.d.data.alias1.toLowerCase().includes(value)) ||
      (s.d.data.alias2 && s.d.data.alias2.toLowerCase().includes(value))
    ).slice(0, 10);

    if (suggestions.length === 0) {
      suggestionBox.style.display = "none";
      return;
    }

    suggestions.forEach(s => {
      const div = document.createElement("div");
      div.innerHTML = `<span>${s.display}</span>`;
      div.className = "px-4 py-2 hover:bg-gray-200 cursor-pointer text-xl";
      div.onclick = function() {
        input.value = s.display; // Only show name + alias, nothing else
        suggestionBox.style.display = "none";
        window[globalVar] = s.d; // Store the D3 node reference!
      };
      suggestionBox.appendChild(div);
    });

    suggestionBox.style.display = "block";
    suggestionBox.style.position = "absolute";
    suggestionBox.style.zIndex = 10000;
    suggestionBox.style.width = input.offsetWidth + "px";
  });

  document.addEventListener("click", function(e) {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      suggestionBox.style.display = "none";
    }
  });
  input.addEventListener("blur", function() {
    setTimeout(() => { suggestionBox.style.display = "none"; }, 200);
  });
}

function countNames(node) {
  let count = 0;
  if (node.data && node.data.name) {
    count = 1; // Count the current node
  }
  if (node.children) {
    node.children.forEach(child => {
      count += countNames(child); // Recursively count children
    });
  }
  return count;
}

// New function to generate a list of all couples for autocomplete
function generateCouplesList(node) {
    const couplesSet = new Set();
    function findSpouses(n) {
        if (!n) return;
        if (n.name && n.spouses && n.spouses.length > 0) {
            n.spouses.forEach(spouse => {
                if (spouse.name) {
                    // Sort names to avoid duplicates (e.g., A+B and B+A)
                    const pair = [n.name, spouse.name].sort().join('+');
                    couplesSet.add(pair);
                }
            });
        }
        if (n.children) n.children.forEach(findSpouses);
        if (n.spouses) n.spouses.forEach(findSpouses);
    }
    findSpouses(node);
    allCouples = Array.from(couplesSet);
}

d3.json("family_tree.json").then(function(originalData) {
  // First, generate the couples list from the original data
  generateCouplesList(originalData);
    
  const structured = restructureData(originalData);
  root = d3.hierarchy(structured);
  root.x0 = dy / 2;
  root.y0 = 0;
  allNameObjects = [];
  update(root);
  
  const totalNames = countNames(root);
  document.getElementById("name-count").textContent = `${totalNames} family members`;

  setupLineAutocomplete("lineFrom", "lineFromSuggestions", "selectedFromNode");
  setupLineAutocomplete("lineTo", "lineToSuggestions", "selectedToNode");

  // Setup for the "Find" button in the family modal
  document.getElementById('familyModalFind').onclick = findFamily;
  
  allNameObjects = [];
  function getAllTreeNodes(root) {
  const all = [];
  root.each(function(d) {
    // Build context/parent chain for display (up to 2 parents, but can be extended)
    let chain = [];
    let cur = d.parent;
    while (cur && cur.data && cur.data.name !== "Root") {
      chain.unshift(cur.data.name);
      cur = cur.parent;
    }
    let context = chain.length > 0 ? ` – child of ${chain.join(" > ")}` : "";
    let alias = d.data.alias1 ? ` (${d.data.alias1})` : "";
    all.push({
      d, // d is the d3 node object!
      display: `${d.data.name}${alias}${context}`
    });
  });
  return all;
}

function collectNames(node) {
  if (!node) return;
  if (node.data) {
    allNameObjects.push({
      name: node.data.name || "",
      alias1: node.data.alias1 || "",
      alias2: node.data.alias2 || "",
    });
  }
  if (node.children) node.children.forEach(collectNames);
}
collectNames(root);
// Remove duplicates and empties
const seen = new Set();
allNameObjects = allNameObjects.filter(n => {
  const key = `${n.name}|${n.alias1}|${n.alias2}`;
  if (seen.has(key) || !n.name) return false;
  seen.add(key);
  return true;
});

// --- AUTOCOMPLETE FOR MAIN SEARCH BOX ---

(function setupSearchAutocomplete() {
  const input = document.getElementById("searchBox");
  const suggestionBox = document.getElementById("searchSuggestions");

  input.addEventListener("input", function(e) {
    const value = input.value.trim().toLowerCase();
    suggestionBox.innerHTML = "";
    if (!value) {
      suggestionBox.style.display = "none";
      return;
    }

    // Use all nodes and display only name/alias
    const nodes = [];
    root.each(function(d) {
      if (d.data && d.data.name) nodes.push(d);
    });

    const suggestions = nodes.filter(d =>
      (d.data.name && d.data.name.toLowerCase().includes(value)) ||
      (d.data.alias1 && d.data.alias1.toLowerCase().includes(value)) ||
      (d.data.alias2 && d.data.alias2.toLowerCase().includes(value))
    ).slice(0, 10);

    if (suggestions.length === 0) {
      suggestionBox.style.display = "none";
      return;
    }

    suggestions.forEach(d => {
      const name = d.data.name || "";
      const alias1 = d.data.alias1 ? ` (${d.data.alias1})` : "";
      const alias2 = d.data.alias2 ? ` (${d.data.alias2})` : "";
      const label = `${name}${alias1}${alias2}`;

      const div = document.createElement("div");
      div.innerHTML = `<span>${label}</span>`;
      div.className = "px-4 py-2 hover:bg-gray-200 cursor-pointer text-xl";
      div.onclick = function() {
        input.value = name;
        suggestionBox.style.display = "none";
        // Optionally trigger search immediately:
        // searchTree();
      };
      suggestionBox.appendChild(div);
    });

    suggestionBox.style.display = "block";
    suggestionBox.style.position = "absolute";
    suggestionBox.style.zIndex = 10000;
    suggestionBox.style.width = input.offsetWidth + "px";
  });

  document.addEventListener("click", function(e) {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      suggestionBox.style.display = "none";
    }
  });
  input.addEventListener("blur", function() {
    setTimeout(() => { suggestionBox.style.display = "none"; }, 200);
  });
})();

// --- Autocomplete for Family Search ---
setupFamilyAutocomplete();

  // Find Rajmah node after the tree is rendered
  const rajmahNode = root.descendants().find(n => 
    n.data.name === "Rajmah" || 
    n.data.name === "+ Rajmah"
  );

  if (rajmahNode) {
    // Center the view on Rajmah
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2 - rajmahNode.y, dx * 20 - rajmahNode.x)
        .scale(1) // Optional: Adjust zoom level (e.g., 0.8 for zoomed out)
    );
  } else {
    console.warn("Rajmah node not found in the tree.");
  }
});

function searchTree() {
  const query = document.getElementById("searchBox").value.trim().toLowerCase();
  const messageEl = document.getElementById("searchMessage");
  let matchedNodeData = null;

  d3.selectAll("text").each(function(d) {
    const textEl = d3.select(this);
    const matchText = [d.data.name, d.data.alias1 || "", d.data.alias2 || ""].join(" ").toLowerCase();
    textEl.interrupt().style("fill", "#CCCCCC").attr("transform", "scale(1)").classed("matched", false);

   if (query && matchText.includes(query) && !matchedNodeData) {
  matchedNodeData = d;
  textEl.classed("matched", true);

  // Start blinking animation
  function blink() {
    textEl
      .transition()
      .duration(350)
      .style("fill", "#e53935") // blink color
      .attr("transform", "scale(1.15)")
      .transition()
      .duration(350)
      .style("fill", "#d97706") // another blink color
      .attr("transform", "scale(1)")
      .on("end", blink);
  }
  blink();
  const nameDiv = document.getElementById("searchName");
  const img = document.getElementById("searchImage");
  if (d.data.image) {
    img.src = d.data.image;
    img.style.display = "block";
    nameDiv.textContent = d.data.name; // Set the name
    nameDiv.style.display = "block";   // Show the name
  } else {
    img.style.display = "none";
    nameDiv.style.display = "none"; // Hide if no image
  }


}

  });

  if (matchedNodeData) {
  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity.translate(width / 2 - matchedNodeData.y, dx * 20 - matchedNodeData.x)
  );
  messageEl.textContent = "";
} else {
 const searchValue = document.getElementById("searchBox").value.trim();
  showCustomAlert(`The search name "<span style='color:#f87171;'>${searchValue}</span>" not found.`);
  document.getElementById("searchImage").style.display = "none";
  document.getElementById("searchName").style.display = "none"; // Hide name display on not found

}

}

function resetZoom() {
  location.reload()
}

function clearSearch() {
  d3.selectAll("text")
    .interrupt() // Interrupt any ongoing transitions (like blinking)
    .classed("matched", false) // Remove matched class
    .transition()
    .duration(300)
    .style("fill", "#CCCCCC") // Reset color to white
    .attr("transform", "scale(1)");

  d3.selectAll("image.search-img").remove();

  document.getElementById("searchBox").value = "";
  document.getElementById("searchMessage").textContent = "";
  document.getElementById("searchImage").style.display = "none";
  document.getElementById("searchName").style.display = "none"; // 
}

let currentFontSize = 25; // starting font size in px

function adjustFontSize(delta) {
  currentFontSize = Math.max(6, currentFontSize + delta); // min font size = 6px
  d3.select("svg").style("font", currentFontSize + "px sans-serif");
}

function showCustomAlert(msg) {
  const modal = document.getElementById("customAlert");
  const msgDiv = document.getElementById("customAlertMsg");
  msgDiv.innerHTML = msg;
  modal.style.display = "flex";
}

function hideCustomAlert() {
  document.getElementById("customAlert").style.display = "none";
}

function openLineModal() {
  document.getElementById('lineModal').style.display = 'flex';
  document.getElementById('lineFrom').value = '';
  document.getElementById('lineTo').value = '';
  document.getElementById('lineError').textContent = '';
  document.getElementById('lineFromSuggestions').style.display = 'none';
  document.getElementById('lineToSuggestions').style.display = 'none';
  window.selectedFromNode = null;
  window.selectedToNode = null;
  setTimeout(() => {
    document.getElementById('lineFrom').focus();
  }, 100);
}
function closeLineModal() {
  document.getElementById('lineModal').style.display = 'none';
  document.getElementById('lineFromSuggestions').style.display = 'none';
  document.getElementById('lineToSuggestions').style.display = 'none';
  window.selectedFromNode = null;
  window.selectedToNode = null;
}


function findNodeByAnyName(name) {
  if (!root || !name) return null;
  const cleanName = name.replace(/^\+\s*/, "").trim().toLowerCase();
  
  return root.descendants().find(d => {
    const nodeName = d.data.name?.toLowerCase() || "";
    const alias1 = d.data.alias1?.toLowerCase() || "";
    const alias2 = d.data.alias2?.toLowerCase() || "";
    
    return nodeName.includes(cleanName) || 
           alias1.includes(cleanName) || 
           alias2.includes(cleanName);
  });
}

// Show the story (replace alert with modal or content as needed)
function showStory(type) {
  let pdfFile = "";
  if (type === "chewo") {
    pdfFile = "docs/chewo_mokwo_story.pdf";
  } else if (type === "umi") {
    pdfFile = "docs/umi_story.pdf";
  } else if (type === "babo") {
    pdfFile = "docs/babo_story.pdf";
  }
  if (pdfFile) {
    window.open(pdfFile, "_blank");
  }
}

// === Family Modal Logic ===

function setupFamilyAutocomplete() {
    const input = document.getElementById("familySearchInput");
    const suggestionBox = document.getElementById("familySuggestions");

    input.addEventListener("input", function(e) {
        const value = input.value.trim().toLowerCase();
        suggestionBox.innerHTML = "";
        if (!value) {
            suggestionBox.style.display = "none";
            return;
        }

        const suggestions = allCouples.filter(c => c.toLowerCase().includes(value)).slice(0, 10);
        
        if (suggestions.length === 0) {
            suggestionBox.style.display = "none";
            return;
        }

        suggestions.forEach(c => {
            const div = document.createElement("div");
            div.textContent = c;
            div.className = "px-4 py-2 hover:bg-gray-200 cursor-pointer text-xl";
            div.onclick = function() {
                input.value = c;
                suggestionBox.style.display = "none";
            };
            suggestionBox.appendChild(div);
        });

        suggestionBox.style.display = "block";
    });

    document.addEventListener("click", function(e) {
        if (!suggestionBox.contains(e.target) && e.target !== input) {
            suggestionBox.style.display = "none";
        }
    });
}


function openFamilyModal() {
  document.getElementById('familyModal').style.display = 'flex';
  document.getElementById('familySearchInput').value = '';
  document.getElementById('familyError').textContent = '';
  document.getElementById('familyResult').innerHTML = '';
  document.getElementById('familySuggestions').style.display = 'none';
  setTimeout(() => {
    document.getElementById('familySearchInput').focus();
  }, 100);
}

function closeFamilyModal() {
  document.getElementById('familyModal').style.display = 'none';
}

function findFamily() {
    const inputElement = document.getElementById('familySearchInput');
    const errorDiv = document.getElementById('familyError');
    const resultDiv = document.getElementById('familyResult');
    resultDiv.innerHTML = '';
    errorDiv.textContent = '';

    const query = inputElement.value.trim();
    if (!query.includes('+')) {
        errorDiv.textContent = 'Please use the format "Husband+Wife".';
        return;
    }

    const names = query.split('+');
    if (names.length !== 2 || !names[0] || !names[1]) {
        errorDiv.textContent = 'Please enter both names in the "Husband+Wife" format.';
        return;
    }

    const name1 = names[0].trim().toLowerCase();
    const name2 = names[1].trim().toLowerCase();
    let familyFound = false;

    function searchSpouses(node) {
        if (familyFound || !node) return;

        const nodeName = (node.name || "").toLowerCase().trim();
        
        if ((nodeName === name1 || nodeName === name2) && node.spouses) {
            const spouse = node.spouses.find(s => 
                (s.name || "").toLowerCase().trim() === (nodeName === name1 ? name2 : name1)
            );
            if (spouse) {
                const hData = nodeName === name1 ? node : spouse;
                const wData = nodeName === name1 ? spouse : node;
                displayFamily(hData, wData, resultDiv);
                familyFound = true;
                return;
            }
        }
        
        if (node.children) node.children.forEach(searchSpouses);
        if (node.spouses) node.spouses.forEach(sp => searchSpouses(sp));
    }

    d3.json("family_tree.json").then(function(originalData) {
        searchSpouses(originalData);

        if (!familyFound) {
            resultDiv.innerHTML = `<p style='color:#f87171'>Could not find a couple matching "<b>${query}</b>". Please check the names and format.</p>`;
        }
    });
}

function displayFamily(husbandData, wifeData, resultDiv) {
    const children = wifeData.children || husbandData.children || [];
    let html = `<div style="font-family: monospace, monospace; font-size: 1.5rem; font-weight: bold;">${husbandData.name}+${wifeData.name}</div>`;

    if (children.length > 0 && children.some(c => c.name && c.name.trim() !== "" && c.name.trim() !== "...")) {
        html += "<ul style='list-style-type: none; padding-left: 0; margin-top: 0.5rem; font-family: monospace, monospace;'>";
        children.forEach(child => {
            if (child.name && child.name.trim() !== "" && child.name.trim() !== "...") {
                html += `<li style="font-size: 1.2rem;">|— ${child.name}</li>`;
            }
        });
        html += "</ul>";
    } else {
        html += "<div style='font-size: 1.2rem; margin-left: 20px; font-style: italic; font-family: monospace, monospace;'>|— No children listed.</div>";
    }
    
    resultDiv.innerHTML = html;
}

// --- MASTER EVENT LISTENER SETUP ---
document.addEventListener('DOMContentLoaded', function() {
    // Mobile View Toggle
    const viewToggle = document.getElementById('view-toggle');
    const appContainer = document.getElementById('app-container');
    if(viewToggle && appContainer) {
        viewToggle.addEventListener('change', function(e) {
            if(e.target.checked) {
                appContainer.classList.add('mobile-view');
            } else {
                appContainer.classList.remove('mobile-view');
            }
        });
    }

    // Story Button Dropdown
    const storyBtn = document.getElementById('storyBtn');
    const storyDropdown = document.getElementById('storyDropdown');
    if (storyBtn && storyDropdown) {
        storyBtn.onclick = function(e) {
            e.stopPropagation();
            storyDropdown.style.display = storyDropdown.style.display === "block" ? "none" : "block";
        };
        document.addEventListener("click", function() {
            if (storyDropdown) storyDropdown.style.display = "none";
        });
        storyDropdown.onclick = function(e) {
            e.stopPropagation();
        };
    }

    // Line Modal OK Button
    const lineModalOkBtn = document.getElementById("lineModalOk");
    if(lineModalOkBtn) {
        lineModalOkBtn.onclick = function() {
            const fromNode = window.selectedFromNode;
            const toNode = window.selectedToNode;
            const errDiv = document.getElementById('lineError');

            if (!fromNode || !toNode) {
              errDiv.textContent = "You must pick both names from the suggestion list!";
              return;
            }

            const extraline = gExtra.selectAll("path.extraline-link").data([1])
              .join("path")
              .attr("class", "extraline-link")
              .attr("d", d3.linkHorizontal()({ source: [fromNode.y, fromNode.x], target: [toNode.y, toNode.x] }))
              .attr("stroke", "#6fd404")
              .attr("stroke-width", 3)
              .attr("stroke-dasharray", "8,4");

            if (window._extralineTimer) window.clearInterval(window._extralineTimer);
            let dashOffsetLocal = 0;
            window._extralineTimer = setInterval(() => {
                dashOffsetLocal = (dashOffsetLocal + 2) % 24;
                extraline.attr("stroke-dashoffset", dashOffsetLocal);
            }, 50);

            const margin = 80;
            const minX = Math.min(fromNode.x, toNode.x) - margin;
            const maxX = Math.max(fromNode.x, toNode.x) + margin;
            const minY = Math.min(fromNode.y, toNode.y) - margin;
            const maxY = Math.max(fromNode.y, toNode.y) + margin;
            const viewWidth = maxY - minY;
            const viewHeight = maxX - minX;
            const svgWidth = width;
            const fitScale = Math.min(svgWidth / viewWidth, (dx * 80) / viewHeight, 8);
            const scale = Math.min(fitScale * 1.5, 8);
            const midX = (fromNode.x + toNode.x) / 2 + 30;
            const midY = (fromNode.y + toNode.y) / 2;

            svg.transition().duration(900).call(
                zoom.transform,
                d3.zoomIdentity.translate(svgWidth / 2 - midY * scale, dx * 24 - midX * scale).scale(scale)
            );
            closeLineModal();
        };
    }

    // Custom Alert Modal Buttons
    const customAlertBtn = document.getElementById("customAlertBtn");
    if (customAlertBtn) customAlertBtn.onclick = hideCustomAlert;
    const customAlertModal = document.getElementById("customAlert");
    if (customAlertModal) {
      customAlertModal.onclick = function(e) {
        if (e.target === this) hideCustomAlert();
      };
    }

    // Family Button to open the modal
    const familyBtn = document.getElementById('familyBtn');
    if (familyBtn) {
        familyBtn.onclick = openFamilyModal;
    }
    
    // Family Modal: Allow "Enter" key to trigger search
    const familySearchInput = document.getElementById("familySearchInput");
    if(familySearchInput) {
        familySearchInput.addEventListener("keydown", function(e) {
            if(e.key === "Enter") {
                document.getElementById("familyModalFind").click();
                e.preventDefault();
            }
        });
    }
});
