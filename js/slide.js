let boxes = document.querySelectorAll(".togglebox")
function start(){
    boxes.forEach(box => {
        box.addEventListener("click", (e) =>{
            boxes.forEach(tbox => {
                tbox.classList.remove("active")
            })
            box.classList.toggle("active")
            lbox = e.target
        })
    });
}
