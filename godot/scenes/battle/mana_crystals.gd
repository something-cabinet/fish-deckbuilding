extends Control

@export var crystals: Array[Node]

func set_crystal_filled(index: int, filled: bool) -> void:
	if index < 0 or index >= crystals.size():
		return
	var crystal = crystals[index] as Panel
	if not crystal:
		return
	var style = StyleBoxFlat.new()
	if filled:
		style.bg_color = Color(0.376, 0.647, 0.98)
	else:
		style.bg_color = Color(0.118, 0.227, 0.298)
	style.corner_radius_all = 4
	style.border_width_all = 1
	style.border_color = Color(0.043, 0.102, 0.141)
	crystal.add_theme_stylebox_override("panel", style)