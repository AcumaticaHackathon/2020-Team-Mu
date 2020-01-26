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
                    ConsoleView.Cache.SetValueExt<ConsoleFields.output>(ConsoleView.Current, result.ToString());
                }
                else
                {
                    ConsoleView.Cache.SetValueExt<ConsoleFields.output>(ConsoleView.Current, "Result yielded no result.");
                }
            }
            catch(CompilationErrorException ex)
            {
                ConsoleView.Cache.SetValueExt<ConsoleFields.output>(ConsoleView.Current, ex.Message);
            }

            return adapter.Get();
        }
    }

    [Serializable]
    public class ConsoleFields : IBqlTable
    {
        public abstract class input : IBqlField { }
        [PXUIField(DisplayName = "Input")]
        public string Input { get; set; }

        public abstract class output : IBqlField { }
        [PXUIField(DisplayName = "Output")]
        public string Output { get; set; }
    }
}
