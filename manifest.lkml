project_name: "mpviz"

# # Use local_dependency: To enable referencing of another project
# # on this instance with include: statements
#
# local_dependency: {
#   project: "name_of_other_project"
# }
visualization: {
  id: "calendar"
  label: "Calendario"
  file: "viz/calendar.js"
  dependencies: ["https://cdn.jsdelivr.net/npm/d3@7"]
}
