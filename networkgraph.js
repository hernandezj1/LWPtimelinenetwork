const width = document.getElementById("graphContainer").clientWidth;
const height = document.getElementById("graphContainer").clientHeight;

const svg = d3.select("svg");
const zoomGroup = svg.append("g");


let allData;
let simulation;


/* =========================
   ZOOM
========================= */

const zoom = d3.zoom()
  .scaleExtent([0.1, 4])
  .on("zoom", (event) => {
    zoomGroup.attr("transform", event.transform);
  });

svg.call(zoom);


/* =========================
   ZOOM BUTTONS
========================= */

document.getElementById("zoomIn").onclick = () => {
  svg.transition().call(zoom.scaleBy, 1.3);
};


document.getElementById("zoomOut").onclick = () => {
  svg.transition().call(zoom.scaleBy, 0.7);
};



/* =========================
   LOAD NETWORK
========================= */

d3.json("pedagogue_network_institution.json")
.then(data => {

  allData = data;

  createGraph(
    data.nodes,
    data.links
  );


  setupTimeline();


})
.catch(err=>{
  console.error("network.json error:", err);
});




/* =========================
   CREATE GRAPH
========================= */

function createGraph(nodes, links){


  /*
    Stop previous simulation
    when filtering timeline
  */

  if(simulation){
    simulation.stop();
  }


  /*
    Clear old graph
  */

  zoomGroup.selectAll("*").remove();



  simulation = d3.forceSimulation(nodes)

    .force(
      "link",
      d3.forceLink(links)
        .id(d => d.id)
        .distance(100)
        .strength(0.5)
    )

    .force(
      "charge",
      d3.forceManyBody()
        .strength(-60)
        .distanceMax(300)
    )

    .force(
      "center",
      d3.forceCenter(
        width / 2,
        height / 2
      )
    )

    .force(
      "x",
      d3.forceX(width / 2)
        .strength(0.01)
    )

    .force(
      "y",
      d3.forceY(height / 2)
        .strength(0.01)
    )

    .force(
      "collision",
      d3.forceCollide()
        .radius(12)
        .strength(0.9)
        .iterations(2)
    )

    .alphaDecay(0.04)
    .velocityDecay(0.4);


  /* LINKS */

  const link = zoomGroup.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class","link");




  /* NODES */

  const node = zoomGroup.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("class","node")
    .attr("r",10)
    .attr("fill",(d) => d.type === "university" ? "#046f10" : "#3b82f6")
    .call(
      d3.drag()
        .on("start",dragstarted)
        .on("drag",dragged)
        .on("end",dragended)
    );




  /* LABELS */

  const label = zoomGroup.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("class","label")
    .text(d=>d.id);




  /* HOVER */

  node.on("mouseover",(event,d)=>{

    d3.select(event.currentTarget)
      .attr("fill","#f59e0b")
      .attr("r",14);


    label.style(
      "opacity",
      l=>l===d ? 1 : 0
    );

  });

  node.on("mouseout", (event, d) => {
    if (d.type === "university") {
      d3.select(event.currentTarget)
        .attr("fill", "#046f10")
        .attr("r", 10);
    } else {
      d3.select(event.currentTarget)
        .attr("fill", "#3b82f6")
        .attr("r", 10);
    }

    label.style("opacity", 0);
  });






  /* CLICK Node and load bio or Wikipedia page */

node.on("click", (event, d) => {

  // Reset every node to its normal type color
  node.attr("fill", n =>
    n.type === "university"
      ? "#046f10"
      : "#3b82f6"
  );


  // Highlight clicked node
  d3.select(event.currentTarget)
    .attr("fill", "#ef4444");


  if (d.type === "university") {

    // University → reusable Wikipedia template
    //document.getElementById("bioFrame").src =
      //"wikipedia_embed.html?url=" +
      //encodeURIComponent(d.url);
    document.getElementById("bioFrame").src = d.url;
  } else {

    // Pedagogue → existing biography page
    document.getElementById("bioFrame").src =
      "bio.html?search=" +
      encodeURIComponent(d.id);

  }

});





  /* SIMULATION */

  simulation.on("tick",()=>{


    link

      .attr("x1",d=>d.source.x)
      .attr("y1",d=>d.source.y)
      .attr("x2",d=>d.target.x)
      .attr("y2",d=>d.target.y);



    node

      .attr("cx",d=>d.x)
      .attr("cy",d=>d.y);



    label

      .attr("x",d=>d.x+8)
      .attr("y",d=>d.y+3);


  });



  /*
    Reset zoom after filtering
  */

  setTimeout(()=>{

    svg.call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width/2-400,height/2-350)
        .scale(0.6)
    );

  },300);



}



/* =========================
   DRAG FUNCTIONS
========================= */


function dragstarted(event,d){

  if(!event.active)
    simulation.alphaTarget(.3).restart();

  d.fx=d.x;
  d.fy=d.y;

}



function dragged(event,d){

  d.fx=event.x;
  d.fy=event.y;

}



function dragended(event,d){

  if(!event.active)
    simulation.alphaTarget(0);

  d.fx=null;
  d.fy=null;

}





/* =========================
   TIMELINE
========================= */


function setupTimeline(){


  const startSlider =
    document.getElementById("yearStart");


  const endSlider =
    document.getElementById("yearEnd");



  startSlider.oninput =
    updateTimeline;


  endSlider.oninput =
    updateTimeline;



}




function updateTimeline(){

  let start =
    +document.getElementById("yearStart").value;

  let end =
    +document.getElementById("yearEnd").value;

  /*
  Prevent backwards range
  */

  if(start > end){

    let temp = start;
    start = end;
    end = temp;

  }

  document.getElementById("minYear")
    .textContent = start;

  document.getElementById("maxYear")
    .textContent = end;


  /*
  Filter links by year
  */

  const filteredLinks =
    allData.links
      .filter(link =>
        Number(link.year) >= start &&
        Number(link.year) <= end
      )
      .map(link => ({
        source:
          typeof link.source === "object"
            ? link.source.id
            : link.source,

        target:
          typeof link.target === "object"
            ? link.target.id
            : link.target,

        year: Number(link.year)
      }));


  /*
  Keep only connected nodes
  */

  const connected =
    new Set();

  filteredLinks.forEach(link => {

    connected.add(link.source);
    connected.add(link.target);

  });


  const filteredNodes =
    allData.nodes
      .filter(node =>
        connected.has(node.id)
      );


  createGraph(
    filteredNodes,
    filteredLinks
  );

}