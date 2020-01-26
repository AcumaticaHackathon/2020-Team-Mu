using System;
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
            PXSmartPanel panel = new PXSmartPanel
            {
                ID = _panelID,
                Width = Unit.Pixel(500),
                Height = Unit.Pixel(350),
                Caption = "Acumatica Shell",
                CaptionVisible = true,
                AutoRepaint = true,
                BlockPage = false,
                LoadOnDemand = false,
                CreateOnDemand = CreateOnDemandMode.False,
                AutoReload = true
            };
            panel.ApplyStyleSheetSkin(controller.Page);
            panel.CreateOnDemand = CreateOnDemandMode.False;

            //This may be needed to update the page behind the panel if we update any value from the console
            //panel.CallBackMode.CommitChanges = true;
            //panel.CallBackMode.PostData = PostDataMode.Page;

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
            var cc = form.TemplateContainer.Controls;
            cc.Add(new PXTextEdit { ID = "pnlConsoleInput", DataField = nameof(AcuShell.ConsoleFields.Input), TextMode = TextBoxMode.MultiLine, SelectOnFocus = false, Wrap = false, Height = Unit.Pixel(230), Width = Unit.Percentage(99) });
            cc.Add(new PXTextEdit { ID = "pnlConsoleOutput", DataField = nameof(AcuShell.ConsoleFields.Output), TextMode = TextBoxMode.MultiLine, SelectOnFocus = false, Wrap = false, Height = Unit.Pixel(50), Width = Unit.Percentage(99) });
            
            PXPanel buttonsPanel = new PXPanel()
            {
                ID = "pnlAcuShellButtons",
                SkinID = "Buttons",
            };
            buttonsPanel.ApplyStyleSheetSkin(controller.Page);

            PXButton runButton = new PXButton()
            {
                ID = "btnAcuShellRun",
                Text = "Run"
            };

            runButton.AutoCallBack.Target = ds.ID;
            runButton.AutoCallBack.Command = nameof(ConsoleExtension.ConsoleRunAction);
            runButton.AutoCallBack.Behavior.RepaintControls = RepaintMode.All;

            buttonsPanel.TemplateContainer.Controls.Add(runButton);

            ((IParserAccessor)panel).AddParsedSubObject(form);
            ((IParserAccessor)panel).AddParsedSubObject(buttonsPanel);
            runButton.ApplyStyleSheetSkin(controller.Page);

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
