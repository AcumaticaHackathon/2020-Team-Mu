using System;
using System.Collections;
using System.Threading.Tasks;
using Microsoft.CodeAnalysis.CSharp.Scripting;
using Microsoft.CodeAnalysis.Scripting;
using PX.Data;

namespace AcuShell
{
    public class ConsoleExtension : PXGraphExtension<PXGraph>
    {
        public PXFilter<ConsoleFields> ConsoleView;

        public override void Initialize()
        {
            base.Initialize();

            if (Base.GetType() != typeof(PXGraph) && Base.PrimaryItemType != null)
            {
                PXAction runAction = PXNamedAction.AddAction(Base, Base.PrimaryItemType, nameof(ConsoleRunAction), "Run", new PXButtonDelegate(ConsoleRunAction));
            }
        }

        [PXButton(VisibleOnDataSource = false, CommitChanges = true)]
        public IEnumerable ConsoleRunAction(PXAdapter adapter)
        {
            try
            {
                //TODO: AppDomain.Current.Assemblies
                var result = Task.Run(() => CSharpScript.EvaluateAsync<object>(ConsoleView.Current.Input,
                    options: ScriptOptions.Default.WithReferences(typeof(PXGraph).Assembly), globals: Base)).Result;
            
                if (result != null)
                {
                    ConsoleView.Cache.SetValueExt<ConsoleFields.output>(ConsoleView.Current, ConsoleView.Current.Output + "\r\n" + result.ToString());
                }
                else
                {
                    ConsoleView.Cache.SetValueExt<ConsoleFields.output>(ConsoleView.Current, ConsoleView.Current.Output + "\r\n" + "Result yielded no result.");
                }
            }
            catch(AggregateException ae)
            {
                var sb = new System.Text.StringBuilder();
                foreach (CompilationErrorException ex in ae.InnerExceptions)
                {
                    sb.AppendLine(ex.Message);
                }
                ConsoleView.Cache.SetValueExt<ConsoleFields.output>(ConsoleView.Current, ConsoleView.Current.Output + "\r\n" + sb.ToString());
            }

            return adapter.Get();
        }
    }

    [Serializable]
    public class ConsoleFields : IBqlTable
    {
        public abstract class input : IBqlField { }
        [PXUIField(Visible = false)]
        public string Input { get; set; }

        public abstract class output : IBqlField { }
        public string Output { get; set; }
    }
}
