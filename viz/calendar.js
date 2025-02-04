looker.plugins.visualizations.add({
    create: function(element, config) {
      // Create a container element to let us center the text.
      var container = element.appendChild(document.createElement("div"));
      container.id = "container";
      container.style.width = '100%'
      // Create an element to contain the text.

      this._textElement = container;
    },
    // Render in response to the data or settings changing
    updateAsync: async function(data, element, config, queryResponse, details, done) {
      // Clear any errors from previous updates
      this.clearErrors();

      // TODO
      if (queryResponse.fields.dimensions.length < 1 && queryResponse.fields.measures.length < 1) {
        this.addError({title: "No Dimensions or Measures", message: "This chart requires one dimension and one measure"});
        return;
      }

      document.head.insertAdjacentHTML("beforeend", `<style>.opacity { opacity: 0.5; }</style>`)

        let keyFecha = queryResponse.fields.dimensions[0].name;
        let keyCount = queryResponse.fields.measure_like[0].name;

        let newData = data.map((elem) => ({
        date: new Date(elem[keyFecha].value),
        label: elem[keyFecha].value,
        value: elem[keyCount].value,
        }));

        newData.sort(function(a,b){
            return b.date - a.date;
        });

        const width = document.querySelector("#container").clientWidth; // width of the chart
        const cellSize = (width - 100)/ 53; // height of a day
        const height = (cellSize * 9) ; // height of a week (5 days + padding)

        const enUs = d3.timeFormatDefaultLocale({
            dateTime: "%x, %X",
            date: "%-d/%-m/%Y",
            time: "%-I:%M:%S %p",
            periods: ["AM", "PM"],
            days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            months: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            shortMonths: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        });

        // Define formatting functions for the axes and tooltips.
        const formatDate = d3.utcFormat("%x");
        const formatDay = (i) => "DLMMJVS"[i];
        const formatMonth = d3.utcFormat("%b");

        // Helpers to compute a day’s position in the week.
        const timeWeek = d3.utcMonday;
        const countDay = (i) => (i + 6) % 7;

        let tooltip
        const max = d3.max(newData, (d) => (d.value));
        const min = d3.min(newData, (d) => (d.value));

        let arrayColors =  ["#7fcdae","#7dd389","#9ad97b","#b1db7a","#cadf79","#cadf79","#e5c877","#e7af75", "#ee7772"]

        const color = d3.scaleQuantize([min, max], arrayColors)
        const colorLegend = d3.scaleLinear([0,1,2,3,4,5,6,7,8], arrayColors).clamp(true)
        const years = d3.groups(newData, (d) => d.date.getUTCFullYear()).reverse();

        function pathMonth(t) {
        const d = Math.max(0, Math.min(7, countDay(t.getUTCDay())));
        const w = timeWeek.count(d3.utcYear(t), t);
        return `${d === 0 ? `M${w * cellSize},0` : d === 7 ? `M${(w + 1) * cellSize},0` : `M${(w + 1) * cellSize},0V${d * cellSize}H${w * cellSize}`}V${7 * cellSize}`;
        }
        const svg = d3
        .create("svg")
        .attr("width", width)
        .attr("height", (height * years.length) + 40)
        .attr("viewBox", [0, 0, width, (height * years.length) + 40])
        .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;");


        const year = svg
        .selectAll("g")
        .data(years)
        .join("g")
        .attr(
            "transform",
            (d, i) => `translate(60.5,${height * i + cellSize * 1.5})`
        );

        year
        .append("text")
        .attr("x", -5)
        .attr("y", -5)
        .attr("font-weight", "bold")
        .attr("text-anchor", "end")
        .text(([key]) => key);

        year
        .append("g")
        .attr("text-anchor", "end")
        .selectAll()
        .data(d3.range(0, 7))
        .join("text")
        .attr("x", -5)
        .attr("y", (i) => (countDay(i) + 0.5) * cellSize)
        .attr("dy", "0.31em")
        .text(formatDay);

        year
        .append("g")
        .selectAll()
        .data(([, values]) => values
        )
        .join("rect")
        .attr("class", (d) => {
            let col = color(d.value)
            let num = 0
            for (let i = 0; i < arrayColors.length; i++) {
                if(col == arrayColors[i]) {
                    num = i
                }
            }
            return "elem-"+ num
        })
        .attr("width", cellSize - 1)
        .attr("height", cellSize - 1)
        .attr("x", (d) => timeWeek.count(d3.utcYear(d.date), d.date) * cellSize + 0.5)
        .attr("y", (d) => countDay(d.date.getUTCDay()) * cellSize + 0.5)
        .attr("fill", (d) => {
            if(d.value == null) {
                return "white"
            } else {
                return color(d.value)
            }
        })
        .on("mouseover", function(d){

          tooltip = d3.select("#container")
              .append("div")
              .style("position", "absolute")
              .style("background-color", "black")
              .style("font-family", "Roboto")
              .style("border-radius", "5px")
              .style("color", "white")
              .style("padding", "6px")
              .style("visibility", "hidden");

          tooltip.style("visibility", "visible");
          tooltip.html(`Fecha: ${formatDate(d.target.__data__.date)}<br>
          Cantidad: ${parseFloat(d.target.__data__.value).toFixed(2)}`)
      })
        .on("mousemove", function(){
          tooltip.style("top", (event.pageY-70)+"px").style("left",(event.pageX-50)+"px");
          })
        .on("mouseout", function(){
          tooltip.style("visibility", "hidden");
          });

        const month = year
        .append("g")
        .selectAll()
        .data(([, values]) => {
            return d3.utcMonths(values.at(-1).date, (values[0].date))
        }
        )
        .join("g");

        month
        .filter((d, i) => i)
        .append("path")
        .attr("fill", "none")
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("d", pathMonth);

        month
        .append("text")
        .attr("x", (d) => {
            return timeWeek.count(d3.utcYear(d), timeWeek.ceil(d)) * cellSize + 2;
        })
        .attr("y", -5)
        .text(formatMonth);

        svg
        .selectAll("mydots")
        .data([0,1,2,3,4,5,6,7,8])
        .enter()
        .append("rect")
        .attr("class", (d) => {
            return "elem-"+ d
        })
        .attr("x", (d,i) => {
            return (width/2) + i * 25
        })
        .attr("y", function (d, i) {
            return height * ( years.length) + 20;
        })
        .attr("height", 15)
        .attr("width", 15)
        .style("fill", (d, i) => colorLegend(d))
        .on("mouseover", function(e) {
            let name = e.target.classList[0]
            let elems = document.querySelectorAll("rect")
            for (let i = 0; i < elems.length; i++) {
                elems[i].classList.add("opacity")
            }
            elems = document.querySelectorAll("." + name)
            for (let i = 0; i < elems.length; i++) {
                elems[i].classList.remove("opacity")
            }
        })
        .on("mouseout", function(e) {
            let elems = document.querySelectorAll("rect")
            for (let i = 0; i < elems.length; i++) {
                elems[i].classList.remove("opacity")
            }
        })

        svg
        .append("text")
        .attr("x", 50)
        .attr("y", function (d, i) {
            return height * ( years.length) + 30;
        })
        .attr("height", 15)
        .attr("width", 15)
        .text("Selecciona para identificar las fallas durante el año.");

      // Set the size to the user-selected size
      this._textElement.innerHTML = ''
      this._textElement.append(svg.node());

      // We are done rendering! Let Looker know.
      done()
    }
  });
