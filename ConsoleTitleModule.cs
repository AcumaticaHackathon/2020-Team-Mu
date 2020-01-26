using System;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using PX.Common.Parser;
using PX.Data;
using PX.Web.UI;

namespace AcuShell
{
    public class ConsoleTitleModule : ITitleModule
    {
        public void Initialize(ITitleModuleController controller)
        {
            if (controller == null) throw new ArgumentNullException("controller");

            AppendButton(controller);
            AppendPanels(controller);
        }

        #region Methods
        
        private void AppendButton(ITitleModuleController controller)
        {
            var btn = new PXToolBarButton { Key = "console", Text = "Console" };
            btn.Images.Normal = Sprite.Main.Design;
            btn.PopupPanel = _panelID;
            controller.AppendToolbarItem(btn);
        }

        private void AppendPanels(ITitleModuleController controller)
        {
            controller.Page.ClientScript.RegisterClientScriptInclude(controller.Page.GetType(), "Console", VirtualPathUtility.ToAbsolute("~/Scripts/console.js"));

            PXSmartPanel panel = new PXSmartPanel
            {
                ID = _panelID,
                Width = Unit.Pixel(500),
                Height = Unit.Pixel(350),
                Caption = "Acumatica Console",
                CaptionVisible = true,
                AutoRepaint = true,
                BlockPage = false,
                LoadOnDemand = true, //Needed otherwise ClientEvents.AfterShow won't run on 2nd open of the panel
                AutoReload = true,
                Position = PanelPosition.Manual,
                Overflow = OverflowType.Hidden
            };


            panel.ClientEvents.BeforeLoad = "BeforeLoadConsolePanel";
            panel.ClientEvents.BeforeLoad = "AfterLoadConsolePanel";
            panel.ClientEvents.BeforeShow = "BeforeShowConsolePanel";
            panel.ClientEvents.AfterShow = "AfterShowConsolePanel";
            panel.ClientEvents.BeforeHide = "BeforeHideConsolePanel";
            panel.ClientEvents.AfterHide = "AfterHideConsolePanel";

            panel.ApplyStyleSheetSkin(controller.Page);

            var ds = PXPage.GetDefaultDataSource(controller.Page);
            var viewName = ds.DataGraph.PrimaryView;
       
            var form = new PXFormView()
            {
                ID = "frmAcuShell",
                SkinID = "Transparent",
                DataSourceID = ds.ID,
                DataMember = "ConsoleView",
                AutoRepaint = true
            };
            form.ApplyStyleSheetSkin(controller.Page);
            form.AutoSize.Enabled = true;

            var cc = form.TemplateContainer.Controls;
            cc.Add(new PXHtmlView { ID = "pnlConsoleOutput", DataField = nameof(AcuShell.ConsoleFields.Output), Height = Unit.Pixel(200), Width = Unit.Percentage(100) });
            cc.Add(new PXTextEdit { ID = "pnlConsoleInput", DataField = nameof(AcuShell.ConsoleFields.Input) });
            cc.Add(new PXTextEdit { ID = "pnlGraphType", DataField = nameof(AcuShell.ConsoleFields.GraphType) });

            ((IParserAccessor)panel).AddParsedSubObject(form);

            var editor = new System.Web.UI.WebControls.Panel { ID = "pnlConsoleEditor", Height = Unit.Pixel(200), Width = Unit.Percentage(100) };
            ((IParserAccessor)panel).AddParsedSubObject(editor);

            controller.AppendControl(panel);
        }

        public bool GetDefaultVisibility()
        {
            return true;
        }
        #endregion

        #region Fields

        private const string _panelID = "pnlConsole";
        #endregion
    }
}
