# frozen_string_literal: true

RSpec.describe AdminPluginSerializer do
  subject(:serializer) { described_class.new(instance) }

  let(:instance) { Plugin::Instance.new }

  describe "enabled_setting" do
    it "should return the right value" do
      instance.enabled_site_setting("test")
      expect(serializer.enabled_setting).to eq("test")
    end
  end
end
