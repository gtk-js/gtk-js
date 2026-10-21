use relm4::gtk;
use relm4::gtk::gdk;
use relm4::gtk::glib;
use relm4::gtk::gsk;
use relm4::gtk::gsk::RenderNodeType;
use relm4::gtk::gsk::prelude::*;
use relm4::gtk::prelude::*;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct WidgetSnapshot {
    pub width: f32,
    pub height: f32,
    pub padding: Sides,
    pub border_radius: Corners,
    pub background_color: Option<Color>,
    pub border_widths: Sides,
    pub border_colors: SideColors,
    pub color: Option<Color>,
    pub font_family: Option<String>,
    pub font_weight: Option<u32>,
    pub shadows: Vec<ShadowInfo>,
    pub inset_shadows: Vec<InsetShadowInfo>,
    pub opacity: f32,
    /// Position of a child's border box in its parent's content box (children
    /// of `extract_widget_tree` only).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub css_name: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub css_classes: Vec<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<WidgetSnapshot>,
    /// The colors of the widget's text runs, in drawing order: a label's
    /// links and Pango color attributes give runs their own color.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub text_colors: Vec<Color>,
    /// A text view's display lines: the offset each starts at
    /// (gtk_text_view_forward_display_line()).
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub text_lines: Vec<i32>,
}

#[derive(Debug, Serialize, Default)]
pub struct Sides {
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
    pub left: f32,
}

#[derive(Debug, Serialize, Default)]
pub struct Corners {
    pub top_left: f32,
    pub top_right: f32,
    pub bottom_right: f32,
    pub bottom_left: f32,
}

#[derive(Debug, Serialize)]
pub struct Color {
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub a: f32,
}

#[derive(Debug, Serialize, Default)]
pub struct SideColors {
    pub top: Option<Color>,
    pub right: Option<Color>,
    pub bottom: Option<Color>,
    pub left: Option<Color>,
}

#[derive(Debug, Serialize)]
pub struct ShadowInfo {
    pub color: Color,
    pub dx: f32,
    pub dy: f32,
    pub spread: f32,
    pub blur_radius: f32,
}

#[derive(Debug, Serialize)]
pub struct InsetShadowInfo {
    pub color: Color,
    pub dx: f32,
    pub dy: f32,
    pub spread: f32,
    pub blur_radius: f32,
}

fn rgba_to_color(rgba: &gdk::RGBA) -> Color {
    Color {
        r: rgba.red(),
        g: rgba.green(),
        b: rgba.blue(),
        a: rgba.alpha(),
    }
}

#[allow(deprecated)]
pub fn extract_with_widget<W: IsA<gtk::Widget>>(
    node: &gsk::RenderNode,
    widget: &W,
) -> WidgetSnapshot {
    let mut snapshot = extract_snapshot(node);
    let w = widget.as_ref();

    snapshot.width = w.width() as f32;
    snapshot.height = w.height() as f32;

    // Text color via widget.color() — reliable on all GTK4 versions
    // (TextNode::color() returns garbage on GTK 4.18+ due to GdkColor/GdkRGBA mismatch)
    let color = w.color();
    snapshot.color = Some(rgba_to_color(&color));

    // Padding/border via deprecated GtkStyleContext — still works on GTK 4.20,
    // and there's no non-deprecated replacement for reading computed CSS padding.
    let ctx = w.style_context();
    let padding = ctx.padding();
    snapshot.padding = Sides {
        top: padding.top() as f32,
        right: padding.right() as f32,
        bottom: padding.bottom() as f32,
        left: padding.left() as f32,
    };

    let border = ctx.border();
    snapshot.border_widths = Sides {
        top: border.top() as f32,
        right: border.right() as f32,
        bottom: border.bottom() as f32,
        left: border.left() as f32,
    };

    snapshot
}

/// Recursively extract a full widget tree — each widget gets its own snapshot
/// with its CSS identity (node name + classes) and child widgets.
#[allow(deprecated)]
pub fn extract_widget_tree<W: IsA<gtk::Widget>>(widget: &W) -> WidgetSnapshot {
    let w = widget.as_ref();

    let width = w.width();
    let height = w.height();

    // Snapshot this specific widget to get render-node-derived properties
    let paintable = gtk::WidgetPaintable::new(Some(w));
    let snap_obj = gtk::Snapshot::new();
    paintable.snapshot(&snap_obj, width as f64, height as f64);

    let mut snapshot = if let Some(node) = snap_obj.to_node() {
        extract_with_widget(&node, w)
    } else {
        let mut s = WidgetSnapshot {
            width: width as f32,
            height: height as f32,
            padding: Sides::default(),
            border_radius: Corners::default(),
            background_color: None,
            border_widths: Sides::default(),
            border_colors: SideColors::default(),
            color: None,
            font_family: None,
            font_weight: None,
            shadows: Vec::new(),
            inset_shadows: Vec::new(),
            opacity: 1.0,
            x: None,
            y: None,
            css_name: None,
            css_classes: Vec::new(),
            children: Vec::new(),
            text_colors: Vec::new(),
            text_lines: Vec::new(),
        };
        // Still extract widget API properties even without render nodes
        let color = w.color();
        s.color = Some(rgba_to_color(&color));
        let ctx = w.style_context();
        let padding = ctx.padding();
        s.padding = Sides {
            top: padding.top() as f32,
            right: padding.right() as f32,
            bottom: padding.bottom() as f32,
            left: padding.left() as f32,
        };
        let border = ctx.border();
        s.border_widths = Sides {
            top: border.top() as f32,
            right: border.right() as f32,
            bottom: border.bottom() as f32,
            left: border.left() as f32,
        };
        s
    };

    // CSS identity
    snapshot.css_name = Some(w.css_name().to_string());
    snapshot.css_classes = w.css_classes().iter().map(|s| s.to_string()).collect();

    // Recurse into visible children
    let mut children = Vec::new();
    let mut child = w.first_child();
    while let Some(c) = child {
        if c.is_visible() {
            let mut child_snapshot = extract_widget_tree(&c);
            // Widget coordinates start at the content box.
            if let Some(bounds) = c.compute_bounds(w) {
                child_snapshot.x = Some(bounds.x());
                child_snapshot.y = Some(bounds.y());
            }
            children.push(child_snapshot);
        }
        child = c.next_sibling();
    }
    snapshot.children = children;

    if let Some(view) = w.downcast_ref::<gtk::TextView>() {
        let mut iter = view.buffer().start_iter();
        snapshot.text_lines.push(iter.offset());
        while view.forward_display_line(&mut iter) {
            snapshot.text_lines.push(iter.offset());
        }
    }

    snapshot
}

pub fn extract_snapshot(node: &gsk::RenderNode) -> WidgetSnapshot {
    let bounds = node.bounds();
    let mut snapshot = WidgetSnapshot {
        width: bounds.width(),
        height: bounds.height(),
        padding: Sides::default(),
        border_radius: Corners::default(),
        background_color: None,
        border_widths: Sides::default(),
        border_colors: SideColors::default(),
        color: None,
        font_family: None,
        font_weight: None,
        shadows: Vec::new(),
        inset_shadows: Vec::new(),
        opacity: 1.0,
        x: None,
        y: None,
        css_name: None,
        css_classes: Vec::new(),
        children: Vec::new(),
        text_colors: Vec::new(),
        text_lines: Vec::new(),
    };

    walk_node(node, &mut snapshot);
    snapshot
}

fn walk_node(node: &gsk::RenderNode, snapshot: &mut WidgetSnapshot) {
    match node.node_type() {
        RenderNodeType::ContainerNode => {
            let container: gsk::ContainerNode = node.clone().downcast().unwrap();
            for i in 0..container.n_children() {
                walk_node(&container.child(i), snapshot);
            }
        }

        RenderNodeType::ColorNode => {
            let color_node: gsk::ColorNode = node.clone().downcast().unwrap();
            if snapshot.background_color.is_none() {
                // Only treat as background if the node covers a significant area.
                // Thin slivers (e.g. text underline decorations) should be ignored.
                //
                // Known limitation: WidgetPaintable renders the widget from the window's
                // full render tree, clipped to widget bounds. A parent window background
                // (ColorNode covering the whole window) therefore shows up here with the
                // same bounds as the widget itself and is indistinguishable from the
                // widget's own CSS background. GTK4 removed the style-context property
                // inspection APIs that would let us verify the widget's own CSS background
                // independently. Widgets that have no CSS background but sit on a solid
                // window background will report the window color here. Tests for such
                // widgets (e.g. GtkImage with an icon) must filter background_color.
                let bounds = color_node.bounds();
                let area = bounds.width() * bounds.height();
                let min_bg_area = snapshot.width * snapshot.height * 0.1;
                if area >= min_bg_area {
                    snapshot.background_color = Some(rgba_to_color(&color_node.color()));
                }
            }
        }

        RenderNodeType::RoundedClipNode => {
            let clip_node: gsk::RoundedClipNode = node.clone().downcast().unwrap();
            let clip = clip_node.clip();
            let corners = clip.corner();

            if snapshot.border_radius.top_left == 0.0 && snapshot.border_radius.top_right == 0.0 {
                snapshot.border_radius = Corners {
                    top_left: corners[0].width(),
                    top_right: corners[1].width(),
                    bottom_right: corners[2].width(),
                    bottom_left: corners[3].width(),
                };
            }

            let clip_bounds = clip.bounds();
            let child = clip_node.child();
            let child_bounds = child.bounds();

            if snapshot.padding.top == 0.0
                && snapshot.padding.right == 0.0
                && child_bounds.width() < clip_bounds.width()
            {
                snapshot.padding = Sides {
                    top: child_bounds.y() - clip_bounds.y(),
                    right: (clip_bounds.x() + clip_bounds.width())
                        - (child_bounds.x() + child_bounds.width()),
                    bottom: (clip_bounds.y() + clip_bounds.height())
                        - (child_bounds.y() + child_bounds.height()),
                    left: child_bounds.x() - clip_bounds.x(),
                };
            }

            walk_node(&child, snapshot);
        }

        RenderNodeType::BorderNode => {
            let border_node: gsk::BorderNode = node.clone().downcast().unwrap();
            let widths = border_node.widths();
            snapshot.border_widths = Sides {
                top: widths[0],
                right: widths[1],
                bottom: widths[2],
                left: widths[3],
            };

            let colors = border_node.colors();
            snapshot.border_colors = SideColors {
                top: Some(rgba_to_color(&colors[0])),
                right: Some(rgba_to_color(&colors[1])),
                bottom: Some(rgba_to_color(&colors[2])),
                left: Some(rgba_to_color(&colors[3])),
            };
        }

        RenderNodeType::TextNode => {
            // NOTE: TextNode::color() returns garbage on GTK 4.18+ due to
            // GdkColor/GdkRGBA layout mismatch in the C API. Text color is
            // extracted via widget.get_color() instead (see extract_with_widget).
            let text_node = node.downcast_ref::<gsk::TextNode>().unwrap();

            // The colors of the text runs themselves, through the C getter,
            // which is right for sRGB colors: a Pango color attribute's is
            // (get_color() in gskpango.c).
            let rgba = unsafe {
                *gsk::ffi::gsk_text_node_get_color(
                    text_node.as_ptr() as *const gsk::ffi::GskTextNode,
                )
            };
            snapshot.text_colors.push(Color {
                r: rgba.red,
                g: rgba.green,
                b: rgba.blue,
                a: rgba.alpha,
            });

            if snapshot.font_family.is_none() {
                let font = text_node.font();
                let desc = font.describe();
                snapshot.font_family = desc.family().map(|f| f.to_string());
                snapshot.font_weight =
                    Some(glib::translate::IntoGlib::into_glib(desc.weight()) as u32);
            }
        }

        RenderNodeType::ShadowNode => {
            let shadow_node: gsk::ShadowNode = node.clone().downcast().unwrap();
            for i in 0..shadow_node.n_shadows() {
                let shadow = shadow_node.shadow(i);
                snapshot.shadows.push(ShadowInfo {
                    color: rgba_to_color(shadow.color()),
                    dx: shadow.dx(),
                    dy: shadow.dy(),
                    spread: 0.0,
                    blur_radius: shadow.radius(),
                });
            }
            walk_node(&shadow_node.child(), snapshot);
        }

        RenderNodeType::InsetShadowNode => {
            let inset_node: gsk::InsetShadowNode = node.clone().downcast().unwrap();
            snapshot.inset_shadows.push(InsetShadowInfo {
                color: rgba_to_color(&inset_node.color()),
                dx: inset_node.dx(),
                dy: inset_node.dy(),
                spread: inset_node.spread(),
                blur_radius: inset_node.blur_radius(),
            });
        }

        RenderNodeType::OpacityNode => {
            let opacity_node: gsk::OpacityNode = node.clone().downcast().unwrap();
            snapshot.opacity = opacity_node.opacity();
            walk_node(&opacity_node.child(), snapshot);
        }

        RenderNodeType::TransformNode => {
            let transform_node: gsk::TransformNode = node.clone().downcast().unwrap();
            walk_node(&transform_node.child(), snapshot);
        }

        RenderNodeType::ClipNode => {
            let clip_node: gsk::ClipNode = node.clone().downcast().unwrap();
            walk_node(&clip_node.child(), snapshot);
        }

        RenderNodeType::DebugNode => {
            let debug_node: gsk::DebugNode = node.clone().downcast().unwrap();
            walk_node(&debug_node.child(), snapshot);
        }

        RenderNodeType::OutsetShadowNode => {
            let outset_node: gsk::OutsetShadowNode = node.clone().downcast().unwrap();
            snapshot.shadows.push(ShadowInfo {
                color: rgba_to_color(&outset_node.color()),
                dx: outset_node.dx(),
                dy: outset_node.dy(),
                spread: outset_node.spread(),
                blur_radius: outset_node.blur_radius(),
            });
        }

        // Visual-only nodes that don't carry CSS-equivalent properties.
        // Icons (FillNode, StrokeNode, CairoNode, TextureNode), gradients,
        // and compositing nodes are rendering details — we compare icon
        // presence via the widget tree, not pixel output.
        RenderNodeType::FillNode
        | RenderNodeType::StrokeNode
        | RenderNodeType::CairoNode
        | RenderNodeType::TextureNode
        | RenderNodeType::MaskNode
        | RenderNodeType::LinearGradientNode
        | RenderNodeType::RepeatingLinearGradientNode
        | RenderNodeType::RadialGradientNode
        | RenderNodeType::ConicGradientNode
        | RenderNodeType::ColorMatrixNode
        | RenderNodeType::BlurNode
        | RenderNodeType::BlendNode
        | RenderNodeType::CrossFadeNode
        | RenderNodeType::RepeatNode
        | RenderNodeType::GlShaderNode => {}

        other => {
            panic!("Unhandled render node type: {:?}", other);
        }
    }
}
