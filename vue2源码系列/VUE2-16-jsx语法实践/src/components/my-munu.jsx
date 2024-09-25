import elMenu from "./el-menu.vue";
import elMenuItem from "./el-menu-item.vue";
import elSubmenu from "./el-submenu.vue";
import resub from "./resub.vue";
export default {
  props: {
    data: {},
  },
  components: {
    elMenu,
    elMenuItem,
    elSubmenu,
    resub,
  },

  render() {
    let renderChild = (data) => {
      return data.map((child) =>
        child.children ? (
          <el-submenu>
            <div slot="title">{child.title}</div>
            {renderChild(child.children)}
          </el-submenu>
        ) : (
          <el-menu-item>{child.title}</el-menu-item>
        )
      );
    };

    return <el-menu>{renderChild(this.data)}</el-menu>;
  },
};
