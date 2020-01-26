using System;
using System.Collections;
using System.Linq;
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
                PXAction clearOutputAction = PXNamedAction.AddAction(Base, Base.PrimaryItemType, nameof(ConsoleClearOutputAction), "ConsoleClearOutput", new PXButtonDelegate(ConsoleClearOutputAction));
                ConsoleView.Cache.SetValueExt<ConsoleFields.graphType>(ConsoleView.Current, Base.GetType().FullName); //For code completion on Graph.
            }
        }

        [PXButton(VisibleOnDataSource = false, CommitChanges = true)]
        public IEnumerable ConsoleRunAction(PXAdapter adapter)
        {
            const string OutputStartTag = "<p style='font-family: Consolas; font-size: 10pt; line-height: 16px'>"; //We should edit the CSS of the editor instead
            const string OutputEndTag = "</p>";

            try
            {
                var genericScope = typeof(ConsoleGlobalScope<>);
                Type[] typeArgs = { Base.GetType() };
                var typedScopedType = genericScope.MakeGenericType(typeArgs);
                object typedScope = Activator.CreateInstance(typedScopedType);
                ((IHaveGraph)typedScope).SetGraph(Base);

                var assemblies = AppDomain.CurrentDomain.GetAssemblies().Where(it => !it.IsDynamic && !it.ReflectionOnly && it.ManifestModule.Name != "<Unknown>");
                var result = Task.Run(() => CSharpScript.EvaluateAsync<object>(ConsoleView.Current.Input, globalsType: typedScopedType,
                    options: ScriptOptions.Default.WithReferences(assemblies), globals: typedScope)).Result;
            
                if (result != null)
                {
                    ConsoleView.Cache.SetValueExt<ConsoleFields.output>(ConsoleView.Current, ConsoleView.Current.Output + OutputStartTag + result.ToString() + OutputEndTag);
                }
                else
                {
                    ConsoleView.Cache.SetValueExt<ConsoleFields.output>(ConsoleView.Current, ConsoleView.Current.Output + OutputStartTag + "Execution yielded no result." + OutputEndTag);
                }
            }
            catch(AggregateException ae)
            {
                var sb = new System.Text.StringBuilder();
                foreach (Exception ex in ae.InnerExceptions)
                {
                    sb.AppendLine(ex.Message);
                }
                ConsoleView.Cache.SetValueExt<ConsoleFields.output>(ConsoleView.Current, ConsoleView.Current.Output + OutputStartTag + sb.ToString() + OutputEndTag);
            }

            return adapter.Get();
        }

        [PXButton(VisibleOnDataSource = false, CommitChanges = false)]
        public IEnumerable ConsoleClearOutputAction(PXAdapter adapter)
        {
            ConsoleView.Cache.SetValueExt<ConsoleFields.output>(ConsoleView.Current, String.Empty);
            return adapter.Get();
        }
    }

    public interface IHaveGraph
    {
        void SetGraph(PXGraph graph);
    }

    public class ConsoleGlobalScope<T> : IHaveGraph
        where T : PXGraph
    {
        public T Graph
        {
            get;
            set;
        }

        public void SetGraph(PXGraph graph)
        {
            this.Graph = graph as T;
        }
    }

    [Serializable]
    public class ConsoleFields : IBqlTable
    {
        public abstract class graphType : IBqlField { }
        [PXUIField(Visible = false)]
        public string GraphType { get; set; }

        public abstract class input : IBqlField { }
        [PXUIField(Visible = false)]
        public string Input { get; set; }

        public abstract class output : IBqlField { }
        public string Output { get; set; }
    }
}
