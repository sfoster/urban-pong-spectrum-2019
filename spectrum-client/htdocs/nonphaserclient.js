
var max_color_array_length = 4
var current_color_array = []

function color_click(ev) {
  let colorstr = ev.target.attributes["data-color"].value;
  let colorarray = [
    parseInt(colorstr.slice(0, 2), 16),
    parseInt(colorstr.slice(2, 4), 16),
    parseInt(colorstr.slice(4, 8), 16),
  ];

  if (current_color_array.length < max_color_array_length) {
    current_color_array.push(colorarray);
  }
  console.log(current_color_array);
}

function send_click(ev) {
  // from client.js
  sendParticularPulseMessage(current_color_array);
  current_color_array.clear();
}


let colorbuttons = document.getElementsByClassName("colorbutton");

for (but of colorbuttons) {
  but.style.backgroundColor = `#${but.attributes["data-color"].value}`;
  but.addEventListener("click", color_click);
}

let sendbutton = document.querySelector(".sendbutton");
sendbutton.addEventListener("click", send_click);
