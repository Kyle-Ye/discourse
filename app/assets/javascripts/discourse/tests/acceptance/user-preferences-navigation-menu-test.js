import { test } from "qunit";

import { click, visit } from "@ember/test-helpers";

import {
  acceptance,
  exists,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import selectKit from "discourse/tests/helpers/select-kit-helper";
import Site from "discourse/models/site";
import I18n from "I18n";

acceptance("User Preferences - Navigation Menu", function (needs) {
  needs.user({
    sidebar_category_ids: [],
    sidebar_tags: [],
    display_sidebar_tags: true,
  });

  needs.settings({
    navigation_menu: "sidebar",
    tagging_enabled: true,
  });

  let updateUserRequestBody = null;

  needs.hooks.afterEach(() => {
    updateUserRequestBody = null;
  });

  needs.pretender((server, helper) => {
    server.put("/u/eviltrout.json", (request) => {
      updateUserRequestBody = helper.parsePostData(request.requestBody);

      // if only the howto category is updated, intentionally cause an error
      if (
        updateUserRequestBody["sidebar_category_ids[]"]?.[0] === "10" ||
        updateUserRequestBody["sidebar_tag_names[]"]?.[0] === "gazelle"
      ) {
        // This request format will cause an error
        return helper.response(400, {});
      } else {
        return helper.response({
          user: {
            sidebar_tags: [
              { name: "monkey", pm_only: false },
              { name: "gazelle", pm_only: false },
            ],
          },
        });
      }
    });
  });

  test("sidebar preferences link is not shown when navigation menu is set to legacy", async function (assert) {
    this.siteSettings.navigation_menu = "legacy";

    await visit("/u/eviltrout/preferences");

    assert.dom(".nav-sidebar").doesNotExist();
  });

  test("user encountering error when adding categories to sidebar", async function (assert) {
    updateCurrentUser({ sidebar_category_ids: [6] });

    await visit("/");

    assert.ok(
      exists(
        ".sidebar-section[data-section-name='categories'] .sidebar-section-link-wrapper[data-category-id=6] a"
      ),
      "support category is present in sidebar"
    );

    await click(
      ".sidebar-section[data-section-name='categories'] .sidebar-section-header-button"
    );

    const categorySelector = selectKit(".category-selector");
    await categorySelector.expand();
    await categorySelector.selectKitSelectRowByName("howto");
    await categorySelector.deselectItemByName("support");

    await click(".save-changes");

    assert.deepEqual(
      updateUserRequestBody["sidebar_category_ids[]"],
      ["10"],
      "contains the right request body to update user's sidebar category links"
    );

    assert.ok(exists(".dialog-body"), "error message is displayed");

    await click(".dialog-footer .btn-primary");

    assert.ok(
      !exists(
        ".sidebar-section[data-section-name='categories'] .sidebar-section-link-wrapper[data-category-id=10] a"
      ),
      "howto category is not displayed in sidebar"
    );

    assert.ok(
      exists(
        ".sidebar-section[data-section-name='categories'] .sidebar-section-link-wrapper[data-category-id=6] a"
      ),
      "support category is displayed in sidebar"
    );
  });

  test("user adding categories to sidebar when default sidebar categories have not been configured", async function (assert) {
    updateCurrentUser({ admin: false, display_sidebar_tags: false });
    await visit("/u/eviltrout/preferences/navigation-menu");

    const categorySelector = selectKit(".category-selector");
    await categorySelector.expand();
    await categorySelector.selectKitSelectRowByName("support");
    await categorySelector.selectKitSelectRowByName("bug");

    await click(".save-changes");

    assert.ok(
      exists(
        ".sidebar-section[data-section-name='categories'] .sidebar-section-link-wrapper[data-category-id=6] a"
      ),
      "support category has been added to sidebar"
    );

    assert.ok(
      exists(
        ".sidebar-section[data-section-name='categories'] .sidebar-section-link-wrapper[data-category-id=1] a"
      ),
      "bug category has been added to sidebar"
    );
  });

  test("user adding categories to sidebar when default sidebar categories have been configured", async function (assert) {
    this.siteSettings.default_navigation_menu_categories = "5";

    await visit("/");
    await click(
      ".sidebar-section[data-section-name='categories'] .sidebar-section-header-button"
    );

    const categorySelector = selectKit(".category-selector");
    await categorySelector.expand();
    await categorySelector.selectKitSelectRowByName("support");
    await categorySelector.selectKitSelectRowByName("bug");

    await click(".save-changes");

    assert.ok(
      exists(
        ".sidebar-section[data-section-name='categories'] .sidebar-section-link-wrapper[data-category-id=6] a"
      ),
      "support category has been added to sidebar"
    );

    assert.ok(
      exists(
        ".sidebar-section[data-section-name='categories'] .sidebar-section-link-wrapper[data-category-id=1] a"
      ),
      "bug category has been added to sidebar"
    );

    assert.deepEqual(
      updateUserRequestBody["sidebar_category_ids[]"],
      ["6", "1"],
      "contains the right request body to update user's sidebar category links"
    );
  });

  test("user encountering error when adding tags to sidebar", async function (assert) {
    updateCurrentUser({ sidebar_tags: [{ name: "monkey", pm_only: false }] });

    await visit("/");

    assert.ok(
      exists(
        ".sidebar-section[data-section-name='tags'] .sidebar-section-link-wrapper[data-tag-name=monkey]"
      ),
      "monkey tag is displayed in sidebar"
    );

    await click(
      ".sidebar-section[data-section-name='tags'] .sidebar-section-header-button"
    );

    const tagChooser = selectKit(".tag-chooser");
    await tagChooser.expand();
    await tagChooser.selectKitSelectRowByName("gazelle");
    await tagChooser.deselectItemByName("monkey");

    await click(".save-changes");

    assert.deepEqual(
      updateUserRequestBody["sidebar_tag_names[]"],
      ["gazelle"],
      "contains the right request body to update user's sidebar tag links"
    );

    assert.ok(exists(".dialog-body"), "error message is displayed");

    await click(".dialog-footer .btn-primary");

    assert.ok(
      !exists(
        ".sidebar-section[data-section-name='tags'] .sidebar-section-link-wrapper[data-tag-name=gazelle]"
      ),
      "gazelle tag is not displayed in sidebar"
    );

    assert.ok(
      exists(
        ".sidebar-section[data-section-name='tags'] .sidebar-section-link-wrapper[data-tag-name=monkey]"
      ),
      "monkey tag is displayed in sidebar"
    );
  });

  test("user should not see tag chooser when display_sidebar_tags property is false", async function (assert) {
    updateCurrentUser({ display_sidebar_tags: false });

    await visit("/u/eviltrout/preferences/navigation-menu");

    assert.ok(!exists(".tag-chooser"), "tag chooser is not displayed");
  });

  test("user adding tags to sidebar when default tags have not been configured", async function (assert) {
    await visit("/u/eviltrout/preferences/navigation-menu");

    const tagChooser = selectKit(".tag-chooser");
    await tagChooser.expand();
    await tagChooser.selectKitSelectRowByName("monkey");

    await click(".save-changes");

    assert.ok(
      exists(
        ".sidebar-section[data-section-name='tags'] .sidebar-section-link-wrapper[data-tag-name=monkey]"
      ),
      "monkey tag has been added to sidebar"
    );
  });

  test("user adding tags to sidebar when default tags have been configured", async function (assert) {
    this.siteSettings.default_navigation_menu_tags = "tag1|tag2";

    await visit("/");
    await click(
      ".sidebar-section[data-section-name='tags'] .sidebar-section-header-button"
    );

    const tagChooser = selectKit(".tag-chooser");
    await tagChooser.expand();
    await tagChooser.selectKitSelectRowByName("monkey");
    await tagChooser.selectKitSelectRowByName("gazelle");

    await click(".save-changes");

    assert.ok(
      exists(
        ".sidebar-section[data-section-name='tags'] .sidebar-section-link-wrapper[data-tag-name=monkey]"
      ),
      "monkey tag has been added to sidebar"
    );

    assert.ok(
      exists(
        ".sidebar-section[data-section-name='tags'] .sidebar-section-link-wrapper[data-tag-name=gazelle]"
      ),
      "gazelle tag has been added to sidebar"
    );

    assert.deepEqual(
      updateUserRequestBody["sidebar_tag_names[]"],
      ["monkey", "gazelle"],
      "contains the right request body to update user's sidebar tag links"
    );
  });

  test("user enabling sidebar_show_count_of_new_items preference", async function (assert) {
    const categories = Site.current().categories;
    const category1 = categories[0];

    updateCurrentUser({
      sidebar_category_ids: [category1.id],
    });

    this.container.lookup("service:topic-tracking-state").loadStates([
      {
        topic_id: 1,
        highest_post_number: 1,
        last_read_post_number: null,
        created_at: "2022-05-11T03:09:31.959Z",
        category_id: category1.id,
        notification_level: null,
        created_in_new_period: true,
        treat_as_new_topic_start_date: "2022-05-09T03:17:34.286Z",
      },
    ]);

    await visit("/u/eviltrout/preferences/navigation-menu");

    assert
      .dom(
        '.sidebar-section-link[data-link-name="everything"] .sidebar-section-link-suffix.icon.unread'
      )
      .exists("everything link has a dot before the preference is enabled");
    assert
      .dom(
        `.sidebar-section-link[data-link-name="everything"] .sidebar-section-link-content-badge`
      )
      .doesNotExist(
        "everything link doesn't have badge text before the preference is enabled"
      );

    assert
      .dom(
        `.sidebar-section-link-wrapper[data-category-id="${category1.id}"] .sidebar-section-link-suffix.icon.unread`
      )
      .exists("category1 has a dot before the preference is enabled");
    assert
      .dom(
        `.sidebar-section-link-wrapper[data-category-id="${category1.id}"] .sidebar-section-link-content-badge`
      )
      .doesNotExist(
        "category1 doesn't have badge text before the preference is enabled"
      );

    await click(
      ".preferences-navigation-menu-navigation .pref-show-count-new-items input"
    );
    await click(".save-changes");

    assert
      .dom(
        '.sidebar-section-link[data-link-name="everything"] .sidebar-section-link-suffix.icon.unread'
      )
      .doesNotExist(
        "everything link no longer has a dot after the preference is enabled"
      );
    assert
      .dom(
        `.sidebar-section-link[data-link-name="everything"] .sidebar-section-link-content-badge`
      )
      .hasText(
        I18n.t("sidebar.new_count", { count: 1 }),
        "everything link now has badge text after the preference is enabled"
      );

    assert
      .dom(
        `.sidebar-section-link-wrapper[data-category-id="${category1.id}"] .sidebar-section-link-suffix.icon.unread`
      )
      .doesNotExist(
        "category1 doesn't have a dot anymore after the preference is enabled"
      );
    assert
      .dom(
        `.sidebar-section-link-wrapper[data-category-id="${category1.id}"] .sidebar-section-link-content-badge`
      )
      .hasText(
        I18n.t("sidebar.new_count", { count: 1 }),
        "category1 now has badge text after the preference is enabled"
      );
  });

  test("user enabling sidebar_link_to_filtered_list preference", async function (assert) {
    const categories = Site.current().categories;
    const category1 = categories[0];

    updateCurrentUser({
      sidebar_category_ids: [category1.id],
    });

    this.container.lookup("service:topic-tracking-state").loadStates([
      {
        topic_id: 1,
        highest_post_number: 1,
        last_read_post_number: null,
        created_at: "2022-05-11T03:09:31.959Z",
        category_id: category1.id,
        notification_level: null,
        created_in_new_period: true,
        treat_as_new_topic_start_date: "2022-05-09T03:17:34.286Z",
      },
    ]);

    await visit("/u/eviltrout/preferences/navigation-menu");

    assert
      .dom('.sidebar-section-link[data-link-name="everything"]')
      .hasAttribute(
        "href",
        "/latest",
        "everything link's href is the latest topics list before the preference is enabled"
      );
    assert
      .dom(
        `.sidebar-section-link-wrapper[data-category-id="${category1.id}"] .sidebar-section-link`
      )
      .hasAttribute(
        "href",
        "/c/meta/3",
        "category1's link href is the latest topics list of the category before the preference is enabled"
      );

    await click(
      ".preferences-navigation-menu-navigation .pref-link-to-filtered-list input"
    );
    await click(".save-changes");

    assert
      .dom('.sidebar-section-link[data-link-name="everything"]')
      .hasAttribute(
        "href",
        "/new",
        "everything link's href is the new topics list after the preference is enabled"
      );
    assert
      .dom(
        `.sidebar-section-link-wrapper[data-category-id="${category1.id}"] .sidebar-section-link`
      )
      .hasAttribute(
        "href",
        "/c/meta/3/l/new",
        "category1's link href is the new topics list of the category after the preference is enabled"
      );
  });
});
